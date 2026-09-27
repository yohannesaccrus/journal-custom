import "server-only";
import { shopifyAdmin, setVariantStock, adjustVariantStock } from "@/lib/admin/shopify-admin-data";

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

export interface CzStockVariant {
  id: string;
  inventoryItemId: string;
  title: string;
  price: string;
  inventoryQuantity: number;
  tracked: boolean;
  /** What the storefront's `variant.available` reports: sellable now. */
  available: boolean;
  /** The one variant the theme snippet sends to the customizer (first available, else first). */
  usedByCustomizer: boolean;
}

export interface CzStockRow {
  key: string;
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
  nodes: ({
    id: string;
    title: string;
    handle: string;
    status: string;
    featuredMedia: { preview: { image: { url: string } | null } | null } | null;
    variants: {
      nodes: {
        id: string;
        title: string;
        price: string;
        inventoryQuantity: number;
        inventoryPolicy: string;
        inventoryItem: { id: string; tracked: boolean };
      }[];
    };
  } | null)[];
}

const QUERY = `query($ids: [ID!]!) {
  nodes(ids: $ids) {
    ... on Product {
      id title handle status
      featuredMedia { preview { image { url } } }
      variants(first: 100) {
        nodes { id title price inventoryQuantity inventoryPolicy inventoryItem { id tracked } }
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
      price: v.price,
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
