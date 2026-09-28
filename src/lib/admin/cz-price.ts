import "server-only";
import { shopifyAdmin } from "@/lib/admin/shopify-admin-data";
import { CZ_PRICE_PRODUCTS, fetchCzPrices, type CzPriceKey } from "@/lib/admin/cz-stock";

/**
 * Editing a customizer product's price from the admin. The price is typed in IDR (what the
 * storefront customizer shows Indonesian visitors) and every market follows by the same ratio:
 *   - the base price (every market priced by conversion/percentage follows it),
 *   - every price list with a FIXED price for that product (e.g. International in EUR),
 *   - the Indonesia IDR price list, set to exactly the amount typed (no conversion/rounding).
 * The IDR price list is named CATALOG_TITLE and sits on Indonesia's catalog (see setupIdrPriceList);
 * deleting that price list in Shopify undoes it.
 */

const CATALOG_TITLE = "Sanaya customizer (IDR)";
const ZERO_DECIMAL = new Set(["IDR", "JPY", "KRW", "VND", "CLP", "ISK", "HUF", "TWD"]);

interface UserErrors {
  userErrors: { field: string[] | null; message: string }[];
}
function check(what: string, payload: UserErrors) {
  if (payload.userErrors.length) throw new Error(`${what}: ${payload.userErrors.map((e) => e.message).join("; ")}`);
}

/** The IDR price list Indonesian visitors get, or null when there is none yet. Needs `read_markets`. */
export async function findIdrPriceList(): Promise<string | null> {
  const data = await shopifyAdmin<{
    marketsResolvedValues: { currencyCode: string; catalogs: { nodes: { priceList: { id: string; currency: string } | null }[] } };
  }>(`query CzIdrPriceList {
    marketsResolvedValues(buyerSignal: { countryCode: ID }) {
      currencyCode
      catalogs(first: 20) { nodes { id title priceList { id currency } } }
    }
  }`);
  const r = data.marketsResolvedValues;
  return r.catalogs.nodes.find((c) => c.priceList?.currency === "IDR")?.priceList?.id ?? null;
}

/**
 * One-time: gives Indonesia an IDR price list that changes nothing by itself (0% adjustment, no
 * fixed prices) until a price is saved. It goes on Indonesia's existing catalog when it has one
 * without a price list: a second catalog would let the lowest-price rule across catalogs undo any
 * price raised here. Only when there is no such catalog is one created. Explicit, from the admin.
 */
export async function setupIdrPriceList(): Promise<string> {
  const resolved = await shopifyAdmin<{
    marketsResolvedValues: { currencyCode: string; catalogs: { nodes: { id: string; priceList: { id: string; currency: string } | null }[] } };
  }>(`query CzIdrPriceList {
    marketsResolvedValues(buyerSignal: { countryCode: ID }) {
      currencyCode
      catalogs(first: 20) { nodes { id title priceList { id currency } } }
    }
  }`);
  const { currencyCode, catalogs } = resolved.marketsResolvedValues;
  const existing = catalogs.nodes.find((c) => c.priceList?.currency === "IDR")?.priceList?.id;
  if (existing) return existing;
  if (currencyCode !== "IDR") throw new Error(`Indonesia's market sells in ${currencyCode}, not IDR`);
  const bare = catalogs.nodes.find((c) => !c.priceList);
  if (bare) return createIdrPriceList(bare.id, "Indonesia's catalog");

  const markets = await shopifyAdmin<{
    markets: { nodes: { id: string; name: string; conditions: { regionsCondition: { regions: { nodes: { code?: string }[] } } | null } }[] };
  }>(`query CzIndonesiaMarket {
    markets(first: 50) {
      nodes { id name conditions { regionsCondition { regions(first: 250) { nodes { ... on MarketRegionCountry { code } } } } } }
    }
  }`);
  const market = markets.markets.nodes.find((m) => m.conditions.regionsCondition?.regions.nodes.some((r) => r.code === "ID"));
  if (!market) throw new Error("No Shopify market includes Indonesia");

  const catalog = await shopifyAdmin<{ catalogCreate: UserErrors & { catalog: { id: string } | null } }>(
    `mutation CzCatalogCreate($input: CatalogCreateInput!) {
      catalogCreate(input: $input) { catalog { id } userErrors { field message } }
    }`,
    { input: { title: CATALOG_TITLE, status: "ACTIVE", context: { marketIds: [market.id] } } }
  );
  check(`Couldn't create the catalog on market "${market.name}"`, catalog.catalogCreate);
  return createIdrPriceList(catalog.catalogCreate.catalog!.id, `market "${market.name}"`);
}

async function createIdrPriceList(catalogId: string, where: string): Promise<string> {
  const list = await shopifyAdmin<{ priceListCreate: UserErrors & { priceList: { id: string } | null } }>(
    `mutation CzPriceListCreate($input: PriceListCreateInput!) {
      priceListCreate(input: $input) { priceList { id currency } userErrors { field message } }
    }`,
    {
      input: {
        name: CATALOG_TITLE,
        currency: "IDR",
        parent: { adjustment: { type: "PERCENTAGE_DECREASE", value: 0 } },
        catalogId,
      },
    }
  );
  check(`Couldn't create the IDR price list on ${where}`, list.priceListCreate);
  return list.priceListCreate.priceList!.id;
}

const round = (amount: number, currency: string) =>
  ZERO_DECIMAL.has(currency) ? Math.round(amount) : Math.round(amount * 100) / 100;

/** Sets a customizer product's price to `idr` for Indonesia and moves every other market by the same ratio. */
export async function setCzPriceIdr(key: CzPriceKey, idr: number): Promise<void> {
  if (!(key in CZ_PRICE_PRODUCTS)) throw new Error("Unknown product");
  if (!Number.isInteger(idr) || idr <= 0) throw new Error("Price must be a whole number of rupiah, more than 0");

  const current = (await fetchCzPrices())[key];
  if (!current?.idr) throw new Error("Couldn't read the product's current IDR price");
  const idrList = await findIdrPriceList();
  if (!idrList) throw new Error("The Indonesia IDR price list isn't set up yet");
  const ratio = idr / current.idr;
  if (ratio === 1) return;

  const productId = `gid://shopify/Product/${CZ_PRICE_PRODUCTS[key]}`;
  const data = await shopifyAdmin<{
    product: { variants: { nodes: { id: string; price: string }[] } } | null;
    priceLists: { nodes: { id: string; currency: string; prices: { nodes: { price: { amount: string }; variant: { id: string } }[] } }[] };
  }>(
    `query CzProductPrices($id: ID!, $q: String!) {
      product(id: $id) { variants(first: 100) { nodes { id price } } }
      priceLists(first: 50) {
        nodes { id currency prices(first: 100, originType: FIXED, query: $q) { nodes { price { amount } variant { id } } } }
      }
    }`,
    { id: productId, q: `product_id:${CZ_PRICE_PRODUCTS[key]}` }
  );
  if (!data.product) throw new Error("Product not found in Shopify");

  // 1. Base price: every market priced by conversion or a percentage adjustment follows it.
  const base = await shopifyAdmin<{ productVariantsBulkUpdate: UserErrors }>(
    `mutation CzSetBasePrice($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) { userErrors { field message } }
    }`,
    { productId, variants: data.product.variants.nodes.map((v) => ({ id: v.id, price: (Math.round(Number(v.price) * ratio * 100) / 100).toFixed(2) })) }
  );
  check("Couldn't update the base price", base.productVariantsBulkUpdate);

  // 2. Other price lists with a fixed price for it (they ignore the base price), scaled the same.
  for (const list of data.priceLists.nodes) {
    if (list.id === idrList || !list.prices.nodes.length) continue;
    const res = await shopifyAdmin<{ priceListFixedPricesAdd: UserErrors }>(
      `mutation CzScaleFixedPrices($priceListId: ID!, $prices: [PriceListPriceInput!]!) {
        priceListFixedPricesAdd(priceListId: $priceListId, prices: $prices) { userErrors { field message } }
      }`,
      {
        priceListId: list.id,
        prices: list.prices.nodes.map((p) => ({
          variantId: p.variant.id,
          price: { amount: String(round(Number(p.price.amount) * ratio, list.currency)), currencyCode: list.currency },
        })),
      }
    );
    check(`Couldn't update the ${list.currency} price list`, res.priceListFixedPricesAdd);
  }

  // 3. Indonesia: exactly what was typed.
  const res = await shopifyAdmin<{ priceListFixedPricesByProductUpdate: UserErrors }>(
    `mutation CzSetIdrPrice($priceListId: ID!, $prices: [PriceListProductPriceInput!]!) {
      priceListFixedPricesByProductUpdate(priceListId: $priceListId, pricesToAdd: $prices) { userErrors { field message } }
    }`,
    { priceListId: idrList, prices: [{ productId, price: { amount: String(idr), currencyCode: "IDR" } }] }
  );
  check("Couldn't set the IDR price", res.priceListFixedPricesByProductUpdate);
}
