import "server-only";
import { shopifyAdmin, setVariantStock, adjustVariantStock } from "@/lib/admin/shopify-admin-data";
import { CZ_MARKETS, type CzMarketCountry } from "@/lib/markets";

/**
 * The add-on products of the theme's "Sanaya customizer" section that we track as real Shopify
 * inventory. The theme's snippet reads one variant per product and only exposes `available`
 * to the storefront. Journal, Animal upgrade, Charm S/M/L, Corner and Pen holder are left out on
 * purpose: those are counted per design/colour in the asset lists instead (cz-catalog.ts).
 * IDs are the `pid` values in the theme's SanayaCzData; if the theme editor swaps a product,
 * update it here.
 */
export const CZ_PRODUCTS = [
  { key: "pocket", label: "Organizer pocket", productId: "16336007496025" },
  { key: "extraNb", label: "Extra notebook", productId: "16336007594329" },
] as const;

/**
 * The customizer's priced products (handles in the theme's `sanaya_customizer` section settings).
 * An asset's price is the price of the product it adds to the cart: a cover is the journal itself
 * (+ the animal upgrade for animal prints), a charm is Charm S/M/L by size, and so on.
 */
export const CZ_PRICE_PRODUCTS = {
  journal: "16324126835033",
  animal: "16308213055833",
  charmS: "16283323662681",
  charmM: "16283323728217",
  charmL: "16283323760985",
  corner: "16336007397721",
  pen: "16336007463257",
  pocket: "16336007496025",
  extraNb: "16336007594329",
} as const;
export type CzPriceKey = keyof typeof CZ_PRICE_PRODUCTS;

export interface CzMoney {
  amount: number;
  currency: string;
}

/**
 * A price as Shopify has it: `base` in the store currency (USD, not EUR), and what Shopify
 * Markets charges a shopper in each of CZ_MARKETS (its own currency, rate, rounding and price
 * lists, e.g. 40 USD -> Rp 730.000 in Indonesia). `idr` is Indonesia's, which the storefront
 * customizer shows and prices are edited in.
 */
export interface CzPrice {
  base: CzMoney;
  markets: Partial<Record<CzMarketCountry, CzMoney>>;
  idr: number | null;
}

/** Each market's price of a variant, asked for alongside its base price as `m_<country>` aliases. */
const MARKET_PRICES = CZ_MARKETS.map(
  (m) => `m_${m.country}: contextualPricing(context: { country: ${m.country} }) { price { amount currencyCode } }`
).join(" ");
type MarketPriceNode = Record<string, unknown> & { price: string };

function priceOf(v: MarketPriceNode, storeCurrency: string): CzPrice {
  const markets: CzPrice["markets"] = {};
  for (const { country } of CZ_MARKETS) {
    const p = (v[`m_${country}`] as { price: { amount: string; currencyCode: string } } | null)?.price;
    if (p) markets[country] = { amount: Number(p.amount), currency: p.currencyCode };
  }
  return {
    base: { amount: Number(v.price), currency: storeCurrency },
    markets,
    idr: markets.ID?.currency === "IDR" ? markets.ID.amount : null,
  };
}

/** Read-only. Price of the variant the theme snippet sends (first available, else first); missing products are left out. */
export async function fetchCzPrices(): Promise<Partial<Record<CzPriceKey, CzPrice>>> {
  const keys = Object.keys(CZ_PRICE_PRODUCTS) as CzPriceKey[];
  const data = await shopifyAdmin<{
    shop: { currencyCode: string };
    nodes: ({ variants: { nodes: (MarketPriceNode & { availableForSale: boolean })[] } } | null)[];
  }>(
    `query($ids: [ID!]!) {
      shop { currencyCode }
      nodes(ids: $ids) { ... on Product { variants(first: 20) { nodes { price availableForSale ${MARKET_PRICES} } } } }
    }`,
    { ids: keys.map((k) => `gid://shopify/Product/${CZ_PRICE_PRODUCTS[k]}`) }
  );
  const out: Partial<Record<CzPriceKey, CzPrice>> = {};
  keys.forEach((k, i) => {
    const vs = data.nodes[i]?.variants.nodes ?? [];
    const v = vs.find((x) => x.availableForSale) ?? vs[0];
    if (v) out[k] = priceOf(v, data.shop.currencyCode);
  });
  return out;
}

export interface CzStockVariant {
  id: string;
  inventoryItemId: string;
  title: string;
  price: CzPrice;
  inventoryQuantity: number;
  tracked: boolean;
  /** What the storefront's `variant.available` reports: sellable now. */
  available: boolean;
  /** The one variant the theme snippet sends to the customizer (first available, else first). */
  usedByCustomizer: boolean;
}

export interface CzStockRow {
  key: (typeof CZ_PRODUCTS)[number]["key"];
  label: string;
  productId: string;
  found: boolean;
  title: string | null;
  handle: string | null;
  status: string | null;
  imageUrl: string | null;
  variants: CzStockVariant[];
}

interface Response {
  shop: { currencyCode: string };
  nodes: ({
    id: string;
    title: string;
    handle: string;
    status: string;
    featuredMedia: { preview: { image: { url: string } | null } | null } | null;
    variants: {
      nodes: ({
        id: string;
        title: string;
        price: string;
        inventoryQuantity: number;
        inventoryPolicy: string;
        inventoryItem: { id: string; tracked: boolean };
      } & MarketPriceNode)[];
    };
  } | null)[];
}

const QUERY = `query($ids: [ID!]!) {
  shop { currencyCode }
  nodes(ids: $ids) {
    ... on Product {
      id title handle status
      featuredMedia { preview { image { url } } }
      variants(first: 100) {
        nodes { id title price inventoryQuantity inventoryPolicy inventoryItem { id tracked } ${MARKET_PRICES} }
      }
    }
  }
}`;

/** Read-only. One Admin API call for all customizer add-on products. */
export async function fetchCzStock(): Promise<CzStockRow[]> {
  const data = await shopifyAdmin<Response>(QUERY, {
    ids: CZ_PRODUCTS.map((p) => `gid://shopify/Product/${p.productId}`),
  });

  return CZ_PRODUCTS.map((cfg, i) => {
    const node = data.nodes[i];
    if (!node) {
      return { ...cfg, found: false, title: null, handle: null, status: null, imageUrl: null, variants: [] };
    }
    const variants: CzStockVariant[] = node.variants.nodes.map((v) => ({
      id: v.id,
      inventoryItemId: v.inventoryItem.id,
      title: v.title,
      price: priceOf(v, data.shop.currencyCode),
      inventoryQuantity: v.inventoryQuantity,
      tracked: v.inventoryItem.tracked,
      available: !v.inventoryItem.tracked || v.inventoryQuantity > 0 || v.inventoryPolicy === "CONTINUE",
      usedByCustomizer: false,
    }));
    const used = variants.find((v) => v.available) ?? variants[0];
    if (used) used.usedByCustomizer = true;
    return {
      ...cfg,
      found: true,
      title: node.title,
      handle: node.handle,
      status: node.status,
      imageUrl: node.featuredMedia?.preview?.image?.url ?? null,
      variants,
    };
  });
}

/**
 * Sets the stock of one variant of a customizer add-on product. Only inventory items that belong
 * to those products are accepted. If the variant isn't tracked yet, tracking is switched on first
 * (otherwise Shopify ignores the quantity and the storefront keeps saying "available").
 */
export async function setCzProductStock(inventoryItemId: string, quantity: number): Promise<void> {
  if (!Number.isInteger(quantity) || quantity < 0) throw new Error("Stock must be a whole number, 0 or more");
  const rows = await fetchCzStock();
  const variant = rows.flatMap((r) => r.variants).find((v) => v.inventoryItemId === inventoryItemId);
  if (!variant) throw new Error("That variant isn't one of the customizer's products");
  if (!variant.tracked) {
    const res = await shopifyAdmin<{ inventoryItemUpdate: { userErrors: { message: string }[] } }>(
      `mutation($id: ID!) { inventoryItemUpdate(id: $id, input: { tracked: true }) { userErrors { message } } }`,
      { id: inventoryItemId }
    );
    if (res.inventoryItemUpdate.userErrors.length) throw new Error(res.inventoryItemUpdate.userErrors.map((e) => e.message).join("; "));
  }
  await setVariantStock(inventoryItemId, quantity);
}

/** Adds (delta > 0) or removes (delta < 0) units on a variant that is already tracked, never below 0. */
export async function adjustCzProductStock(inventoryItemId: string, delta: number): Promise<void> {
  if (!Number.isInteger(delta) || delta === 0) throw new Error("Amount must be a whole number, not 0");
  const rows = await fetchCzStock();
  const variant = rows.flatMap((r) => r.variants).find((v) => v.inventoryItemId === inventoryItemId);
  if (!variant) throw new Error("That variant isn't one of the customizer's products");
  if (!variant.tracked) throw new Error("This variant isn't tracked yet. Use Set stock first.");
  if (variant.inventoryQuantity + delta < 0) throw new Error(`Only ${variant.inventoryQuantity} in stock, can't remove ${-delta}`);
  await adjustVariantStock(inventoryItemId, delta);
}
