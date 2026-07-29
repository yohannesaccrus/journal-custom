import "server-only";
import { decodeDesign } from "@/lib/design-link";
import type { JournalSelection } from "@/lib/types";

const STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const ACCESS_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const API_VERSION = process.env.SHOPIFY_ADMIN_API_VERSION ?? "2026-01";

async function shopifyAdmin<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  if (!STORE_DOMAIN || !ACCESS_TOKEN) {
    throw new Error("Missing SHOPIFY_STORE_DOMAIN or SHOPIFY_ADMIN_ACCESS_TOKEN env vars");
  }

  const res = await fetch(`https://${STORE_DOMAIN}/admin/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": ACCESS_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Shopify Admin API request failed: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  if (json.errors) {
    throw new Error(`Shopify Admin API error: ${JSON.stringify(json.errors)}`);
  }
  return json.data as T;
}

// ---------- Location ----------

let cachedLocationId: string | null = null;

export async function getPrimaryLocationId(): Promise<string> {
  if (cachedLocationId) return cachedLocationId;
  // Only `id` is used below — `name` isn't, and requesting it requires the
  // `read_locations` (or `read_markets_home`) access scope, which this
  // app's Admin API token doesn't have.
  const data = await shopifyAdmin<{ locations: { nodes: { id: string }[] } }>(
    `query { locations(first: 5) { nodes { id } } }`
  );
  const id = data.locations.nodes[0]?.id;
  if (!id) throw new Error("No Shopify location found");
  cachedLocationId = id;
  return id;
}

// ---------- Assets (products tagged as internal components / sellable add-ons) ----------

export interface AdminVariant {
  id: string;
  title: string;
  sku: string;
  price: string;
  image: { url: string } | null;
  selectedOptions: { name: string; value: string }[];
  inventoryItemId: string;
  inventoryQuantity: number;
  swatchColor: string | null;
}

export interface AdminOptionValue {
  id: string;
  name: string;
}

export interface AdminProduct {
  id: string;
  handle: string;
  title: string;
  status: string;
  tags: string[];
  options: { id: string; name: string; optionValues: AdminOptionValue[] }[];
  variants: AdminVariant[];
}

export const SWATCH_METAFIELD_NAMESPACE = "sanaya";
export const SWATCH_METAFIELD_KEY = "swatch_color";

const ASSET_PRODUCTS_QUERY = `
  query AssetProducts($query: String!, $swatchNamespace: String!, $swatchKey: String!) {
    products(first: 20, query: $query) {
      nodes {
        id
        handle
        title
        status
        tags
        options { id name optionValues { id name } }
        variants(first: 50) {
          nodes {
            id
            title
            sku
            price
            image { url }
            selectedOptions { name value }
            inventoryItem { id }
            inventoryQuantity
            swatchMetafield: metafield(namespace: $swatchNamespace, key: $swatchKey) { value }
          }
        }
      }
    }
  }
`;

interface RawAssetProduct extends Omit<AdminProduct, "variants"> {
  variants: {
    nodes: (Omit<AdminVariant, "inventoryItemId" | "inventoryQuantity" | "swatchColor"> & {
      inventoryItem: { id: string };
      inventoryQuantity: number;
      swatchMetafield: { value: string } | null;
    })[];
  };
}

export async function fetchAssetProducts(): Promise<AdminProduct[]> {
  const data = await shopifyAdmin<{ products: { nodes: RawAssetProduct[] } }>(ASSET_PRODUCTS_QUERY, {
    query: "tag:component OR tag:charm OR tag:patch",
    swatchNamespace: SWATCH_METAFIELD_NAMESPACE,
    swatchKey: SWATCH_METAFIELD_KEY,
  });

  return data.products.nodes.map((p) => ({
    ...p,
    variants: p.variants.nodes.map((v) => ({
      ...v,
      inventoryItemId: v.inventoryItem.id,
      inventoryQuantity: v.inventoryQuantity,
      swatchColor: v.swatchMetafield?.value ?? null,
    })),
  }));
}

export async function setVariantSwatchColor(variantId: string, hex: string | null): Promise<void> {
  if (hex === null) {
    const DELETE_MUTATION = `
      mutation DeleteSwatch($ownerId: ID!, $namespace: String!, $key: String!) {
        metafieldsDelete(metafields: [{ ownerId: $ownerId, namespace: $namespace, key: $key }]) {
          userErrors { field message }
        }
      }
    `;
    const data = await shopifyAdmin<{
      metafieldsDelete: { userErrors: { field: string[]; message: string }[] };
    }>(DELETE_MUTATION, {
      ownerId: variantId,
      namespace: SWATCH_METAFIELD_NAMESPACE,
      key: SWATCH_METAFIELD_KEY,
    });
    const errs = data.metafieldsDelete.userErrors;
    if (errs.length) throw new Error(errs.map((e) => e.message).join("; "));
    return;
  }

  const MUTATION = `
    mutation SetSwatch($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        userErrors { field message }
      }
    }
  `;
  const data = await shopifyAdmin<{
    metafieldsSet: { userErrors: { field: string[]; message: string }[] };
  }>(MUTATION, {
    metafields: [
      {
        ownerId: variantId,
        namespace: SWATCH_METAFIELD_NAMESPACE,
        key: SWATCH_METAFIELD_KEY,
        type: "single_line_text_field",
        value: hex,
      },
    ],
  });
  const errs = data.metafieldsSet.userErrors;
  if (errs.length) throw new Error(errs.map((e) => e.message).join("; "));
}

// ---------- Inventory mutations ----------

const NOT_STOCKED_ERROR = /not stocked at the location/i;

/** Runs `fn`; if it fails because the inventory item was never activated at this location (e.g. a variant created before `activateInventoryAtPrimaryLocation` existed, or created some other way), activates it once and retries — instead of leaving the admin stuck with a permanently un-editable Stock field. */
async function withInventoryActivationRetry<T>(inventoryItemId: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (!(err instanceof Error) || !NOT_STOCKED_ERROR.test(err.message)) throw err;
    await activateInventoryAtPrimaryLocation(inventoryItemId);
    return fn();
  }
}

export async function setVariantStock(inventoryItemId: string, quantity: number): Promise<void> {
  await withInventoryActivationRetry(inventoryItemId, async () => {
    const locationId = await getPrimaryLocationId();
    const MUTATION = `
      mutation SetStock($input: InventorySetQuantitiesInput!) {
        inventorySetQuantities(input: $input) {
          userErrors { field message }
        }
      }
    `;
    const data = await shopifyAdmin<{
      inventorySetQuantities: { userErrors: { field: string[]; message: string }[] };
    }>(MUTATION, {
      input: {
        name: "available",
        reason: "correction",
        ignoreCompareQuantity: true,
        quantities: [{ inventoryItemId, locationId, quantity }],
      },
    });
    const errs = data.inventorySetQuantities.userErrors;
    if (errs.length) throw new Error(errs.map((e) => e.message).join("; "));
  });
}

/**
 * A brand-new variant's inventory item isn't "stocked" at any location by
 * default — `inventorySetQuantities`/`inventoryAdjustQuantities` (used by the
 * Stock field and by `setVariantStock` below) both fail with "The specified
 * inventory item is not stocked at the location" until this runs once.
 */
export async function activateInventoryAtPrimaryLocation(inventoryItemId: string): Promise<void> {
  const locationId = await getPrimaryLocationId();
  const MUTATION = `
    mutation ActivateInventory($inventoryItemId: ID!, $locationId: ID!) {
      inventoryActivate(inventoryItemId: $inventoryItemId, locationId: $locationId, available: 0) {
        userErrors { field message }
      }
    }
  `;
  const data = await shopifyAdmin<{
    inventoryActivate: { userErrors: { field: string[]; message: string }[] };
  }>(MUTATION, { inventoryItemId, locationId });
  const errs = data.inventoryActivate.userErrors;
  if (errs.length) throw new Error(errs.map((e) => e.message).join("; "));
}

export async function adjustVariantStock(inventoryItemId: string, delta: number): Promise<void> {
  await withInventoryActivationRetry(inventoryItemId, async () => {
    const locationId = await getPrimaryLocationId();
    const MUTATION = `
      mutation AdjustStock($input: InventoryAdjustQuantitiesInput!) {
        inventoryAdjustQuantities(input: $input) {
          userErrors { field message }
        }
      }
    `;
    const data = await shopifyAdmin<{
      inventoryAdjustQuantities: { userErrors: { field: string[]; message: string }[] };
    }>(MUTATION, {
      input: {
        name: "available",
        reason: "correction",
        changes: [{ inventoryItemId, locationId, delta }],
      },
    });
    const errs = data.inventoryAdjustQuantities.userErrors;
    if (errs.length) throw new Error(errs.map((e) => e.message).join("; "));
  });
}

export async function updateVariantDetails(
  variantId: string,
  productId: string,
  fields: { price?: string; sku?: string }
): Promise<void> {
  const MUTATION = `
    mutation UpdateVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        userErrors { field message }
      }
    }
  `;
  const variantInput: Record<string, unknown> = { id: variantId };
  if (fields.price !== undefined) variantInput.price = fields.price;
  if (fields.sku !== undefined) variantInput.inventoryItem = { sku: fields.sku };

  const data = await shopifyAdmin<{
    productVariantsBulkUpdate: { userErrors: { field: string[]; message: string }[] };
  }>(MUTATION, {
    productId,
    variants: [variantInput],
  });
  const errs = data.productVariantsBulkUpdate.userErrors;
  if (errs.length) throw new Error(errs.map((e) => e.message).join("; "));
}

export async function renameOptionValue(
  productId: string,
  optionId: string,
  optionValueId: string,
  newName: string
): Promise<void> {
  const MUTATION = `
    mutation RenameOptionValue($productId: ID!, $option: OptionUpdateInput!, $optionValuesToUpdate: [OptionValueUpdateInput!]) {
      productOptionUpdate(productId: $productId, option: $option, optionValuesToUpdate: $optionValuesToUpdate) {
        userErrors { field message }
      }
    }
  `;
  const data = await shopifyAdmin<{
    productOptionUpdate: { userErrors: { field: string[]; message: string }[] };
  }>(MUTATION, {
    productId,
    option: { id: optionId },
    optionValuesToUpdate: [{ id: optionValueId, name: newName }],
  });
  const errs = data.productOptionUpdate.userErrors;
  if (errs.length) throw new Error(errs.map((e) => e.message).join("; "));
}

/**
 * Some internal component products (Cover, String, Pen Holder) exist purely
 * for admin stock/price tracking, but the customer-facing customizer actually
 * reads its option labels from the separate sellable "tag:journal" products.
 * Renaming a component variant would otherwise silently desync from what
 * customers see, so mirror the rename onto every matching journal option
 * value. Charm/Patch/Notebook components are the same product the customer
 * sees (no separate sellable copy), so they never need this.
 *
 * Note: this used to be called "Cord" everywhere (option name, product tag,
 * SKUs) — fully renamed to "String" as of 2026-07-29. The component
 * product's handle (`sanaya-component-cord`) is the one thing left alone,
 * since changing it would break any existing links/references to that URL.
 */
const JOURNAL_OPTION_SYNC: Record<string, { optionName: string; allowPlusEdgeSuffix: boolean }> = {
  cover: { optionName: "Cover", allowPlusEdgeSuffix: false },
  string: { optionName: "String", allowPlusEdgeSuffix: false },
  "pen-holder": { optionName: "Pen Holder", allowPlusEdgeSuffix: true },
};

export async function syncJournalOptionRename(
  componentTags: string[],
  oldName: string,
  newName: string
): Promise<void> {
  const rule = componentTags.map((t) => JOURNAL_OPTION_SYNC[t]).find(Boolean);
  if (!rule || oldName === newName) return;

  const JOURNAL_PRODUCTS_QUERY = `
    query JournalProductOptions {
      products(first: 20, query: "tag:journal") {
        nodes {
          id
          options { id name optionValues { id name } }
        }
      }
    }
  `;
  const data = await shopifyAdmin<{
    products: {
      nodes: { id: string; options: { id: string; name: string; optionValues: { id: string; name: string }[] }[] }[];
    };
  }>(JOURNAL_PRODUCTS_QUERY);

  const suffix = " + Edge";
  for (const product of data.products.nodes) {
    const option = product.options.find((o) => o.name === rule.optionName);
    if (!option) continue;

    const updates: { id: string; name: string }[] = [];
    for (const value of option.optionValues) {
      if (value.name === oldName) {
        updates.push({ id: value.id, name: newName });
      } else if (rule.allowPlusEdgeSuffix && value.name === oldName + suffix) {
        updates.push({ id: value.id, name: newName + suffix });
      }
    }
    if (updates.length === 0) continue;

    const MUTATION = `
      mutation SyncOptionRename($productId: ID!, $option: OptionUpdateInput!, $optionValuesToUpdate: [OptionValueUpdateInput!]) {
        productOptionUpdate(productId: $productId, option: $option, optionValuesToUpdate: $optionValuesToUpdate) {
          userErrors { field message }
        }
      }
    `;
    const res = await shopifyAdmin<{
      productOptionUpdate: { userErrors: { field: string[]; message: string }[] };
    }>(MUTATION, { productId: product.id, option: { id: option.id }, optionValuesToUpdate: updates });
    const errs = res.productOptionUpdate.userErrors;
    if (errs.length) throw new Error(errs.map((e) => e.message).join("; "));
  }
}

export interface JournalSyncResult {
  coverHandle: string;
  coverTitle: string;
  created: number;
  skipped: boolean;
  error?: string;
}

async function addOptionValues(productId: string, optionId: string, names: string[]): Promise<void> {
  const MUTATION = `
    mutation AddOptionValues($productId: ID!, $option: OptionUpdateInput!, $optionValuesToAdd: [OptionValueCreateInput!]) {
      productOptionUpdate(productId: $productId, option: $option, optionValuesToAdd: $optionValuesToAdd) {
        userErrors { field message }
      }
    }
  `;
  const data = await shopifyAdmin<{
    productOptionUpdate: { userErrors: { field: string[]; message: string }[] };
  }>(MUTATION, { productId, option: { id: optionId }, optionValuesToAdd: names.map((name) => ({ name })) });
  const errs = data.productOptionUpdate.userErrors;
  if (errs.length) throw new Error(errs.map((e) => e.message).join("; "));
}

/** Mirrors the SKU pattern already used on real journal variants, e.g. `SANAYA-JRN-CLASSIC-BROWN-STRING-ORANGE-PH-BLACK-EDGE`. */
function journalSku(handle: string, cord: string, pen: string): string {
  const base = handle.replace(/^sanaya-journal-/, "sanaya-jrn-").toUpperCase();
  const slug = (s: string) => s.toUpperCase().replace(/\s*\+\s*/g, "-").replace(/\s+/g, "-");
  return `${base}-STRING-${slug(cord)}-PH-${slug(pen)}`;
}

async function bulkCreateJournalVariants(
  productId: string,
  handle: string,
  coverOptionId: string,
  coverValue: string,
  cordOptionId: string,
  penOptionId: string,
  combos: { cord: string; pen: string }[],
  price: string
): Promise<number> {
  if (combos.length === 0) return 0;
  const MUTATION = `
    mutation CreateJournalVariants($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkCreate(productId: $productId, variants: $variants) {
        productVariants { id inventoryItem { id } }
        userErrors { field message }
      }
    }
  `;
  const variants = combos.map(({ cord, pen }) => ({
    price,
    inventoryItem: { sku: journalSku(handle, cord, pen) },
    optionValues: [
      { optionId: coverOptionId, name: coverValue },
      { optionId: cordOptionId, name: cord },
      { optionId: penOptionId, name: pen },
    ],
  }));
  const data = await shopifyAdmin<{
    productVariantsBulkCreate: {
      productVariants: { id: string; inventoryItem: { id: string } }[];
      userErrors: { field: string[]; message: string }[];
    };
  }>(MUTATION, { productId, variants });
  const errs = data.productVariantsBulkCreate.userErrors;
  if (errs.length) throw new Error(errs.map((e) => e.message).join("; "));

  // So the admin can set opening stock per cover in Shopify right away,
  // instead of hitting the same "not stocked at the location" error there too.
  for (const v of data.productVariantsBulkCreate.productVariants) {
    await activateInventoryAtPrimaryLocation(v.inventoryItem.id);
  }

  return combos.length;
}

/**
 * The counterpart to `syncJournalOptionRename` for brand-new Cord/Pen Holder
 * colors: the "+Add variant" button on the matching internal component
 * product only adds a variant *there* (for stock tracking) — customers can't
 * actually pick the new color anywhere until it also exists as a real option
 * value + variant on all 8 sellable "tag:journal" cover products. This
 * generates every valid Cord × Pen Holder combination the customizer's own
 * rule allows (see `catalog.ts` on the client): a real cord pairs with
 * "None" plus every existing real pen holder value; "No Cord" never pairs
 * with a real pen holder. New variants copy the price of that cover's
 * existing variants (price doesn't vary by cord/pen holder within one cover)
 * and start at 0 stock — the admin still sets opening stock per cover
 * directly in Shopify (these combo variants aren't shown in Assets & Stock).
 */
export async function syncJournalOptionAdd(componentTags: string[], newValue: string): Promise<JournalSyncResult[]> {
  const tag = componentTags.find((t) => t === "string" || t === "pen-holder");
  if (!tag) return [];

  const JOURNAL_PRODUCTS_QUERY = `
    query JournalProductsForAddSync {
      products(first: 20, query: "tag:journal") {
        nodes {
          id
          handle
          title
          options { id name optionValues { id name } }
          variants(first: 1) { nodes { price } }
        }
      }
    }
  `;
  const data = await shopifyAdmin<{
    products: {
      nodes: {
        id: string;
        handle: string;
        title: string;
        options: { id: string; name: string; optionValues: { id: string; name: string }[] }[];
        variants: { nodes: { price: string }[] };
      }[];
    };
  }>(JOURNAL_PRODUCTS_QUERY);

  const results: JournalSyncResult[] = [];

  for (const product of data.products.nodes) {
    const coverOption = product.options.find((o) => o.name === "Cover");
    const cordOption = product.options.find((o) => o.name === "String");
    const penOption = product.options.find((o) => o.name === "Pen Holder");
    const coverValue = coverOption?.optionValues[0]?.name;
    if (!coverOption || !coverValue || !cordOption || !penOption) {
      results.push({
        coverHandle: product.handle,
        coverTitle: product.title,
        created: 0,
        skipped: false,
        error: "Missing Cover/String/Pen Holder option",
      });
      continue;
    }
    const price = product.variants.nodes[0]?.price ?? "0.00";

    try {
      if (tag === "string") {
        if (cordOption.optionValues.some((v) => v.name === newValue)) {
          results.push({ coverHandle: product.handle, coverTitle: product.title, created: 0, skipped: true });
          continue;
        }
        await addOptionValues(product.id, cordOption.id, [newValue]);
        const penValues = penOption.optionValues.filter((v) => v.name !== "None").map((v) => v.name);
        const combos = ["None", ...penValues].map((pen) => ({ cord: newValue, pen }));
        const created = await bulkCreateJournalVariants(
          product.id,
          product.handle,
          coverOption.id,
          coverValue,
          cordOption.id,
          penOption.id,
          combos,
          price
        );
        results.push({ coverHandle: product.handle, coverTitle: product.title, created, skipped: false });
      } else {
        const edgeValue = `${newValue} + Edge`;
        if (penOption.optionValues.some((v) => v.name === newValue || v.name === edgeValue)) {
          results.push({ coverHandle: product.handle, coverTitle: product.title, created: 0, skipped: true });
          continue;
        }
        await addOptionValues(product.id, penOption.id, [newValue, edgeValue]);
        const cordValues = cordOption.optionValues.filter((v) => v.name !== "No Cord").map((v) => v.name);
        const combos = cordValues.flatMap((cord) => [
          { cord, pen: newValue },
          { cord, pen: edgeValue },
        ]);
        const created = await bulkCreateJournalVariants(
          product.id,
          product.handle,
          coverOption.id,
          coverValue,
          cordOption.id,
          penOption.id,
          combos,
          price
        );
        results.push({ coverHandle: product.handle, coverTitle: product.title, created, skipped: false });
      }
    } catch (err) {
      results.push({
        coverHandle: product.handle,
        coverTitle: product.title,
        created: 0,
        skipped: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return results;
}

export async function updateProductTitle(productId: string, title: string): Promise<void> {
  const MUTATION = `
    mutation UpdateProductTitle($input: ProductInput!) {
      productUpdate(input: $input) {
        userErrors { field message }
      }
    }
  `;
  const data = await shopifyAdmin<{
    productUpdate: { userErrors: { field: string[]; message: string }[] };
  }>(MUTATION, { input: { id: productId, title } });
  const errs = data.productUpdate.userErrors;
  if (errs.length) throw new Error(errs.map((e) => e.message).join("; "));
}

export async function deleteAssetVariant(productId: string, variantId: string): Promise<void> {
  const MUTATION = `
    mutation DeleteVariant($productId: ID!, $variantsIds: [ID!]!) {
      productVariantsBulkDelete(productId: $productId, variantsIds: $variantsIds) {
        userErrors { field message }
      }
    }
  `;
  const data = await shopifyAdmin<{
    productVariantsBulkDelete: { userErrors: { field: string[]; message: string }[] };
  }>(MUTATION, { productId, variantsIds: [variantId] });
  const errs = data.productVariantsBulkDelete.userErrors;
  if (errs.length) throw new Error(errs.map((e) => e.message).join("; "));
}

export async function addAssetVariant(
  productId: string,
  optionId: string,
  optionName: string,
  newValue: string,
  price: string,
  sku: string
): Promise<void> {
  const OPTION_UPDATE = `
    mutation AddOptionValue($productId: ID!, $option: OptionUpdateInput!, $optionValuesToAdd: [OptionValueCreateInput!]) {
      productOptionUpdate(productId: $productId, option: $option, optionValuesToAdd: $optionValuesToAdd) {
        userErrors { field message }
      }
    }
  `;
  const optRes = await shopifyAdmin<{
    productOptionUpdate: { userErrors: { field: string[]; message: string }[] };
  }>(OPTION_UPDATE, {
    productId,
    option: { id: optionId },
    optionValuesToAdd: [{ name: newValue }],
  });
  const optErrs = optRes.productOptionUpdate.userErrors;
  if (optErrs.length) throw new Error(optErrs.map((e) => e.message).join("; "));

  const VARIANT_CREATE = `
    mutation CreateVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkCreate(productId: $productId, variants: $variants) {
        productVariants { id inventoryItem { id } }
        userErrors { field message }
      }
    }
  `;
  const varRes = await shopifyAdmin<{
    productVariantsBulkCreate: {
      productVariants: { id: string; inventoryItem: { id: string } }[];
      userErrors: { field: string[]; message: string }[];
    };
  }>(VARIANT_CREATE, {
    productId,
    variants: [
      {
        price,
        inventoryItem: { sku },
        optionValues: [{ optionId, name: newValue }],
      },
    ],
  });
  const varErrs = varRes.productVariantsBulkCreate.userErrors;
  if (varErrs.length) throw new Error(varErrs.map((e) => e.message).join("; "));

  const inventoryItemId = varRes.productVariantsBulkCreate.productVariants[0]?.inventoryItem.id;
  if (inventoryItemId) await activateInventoryAtPrimaryLocation(inventoryItemId);
}

// ---------- Variant image upload ----------

/** Attaches an already-hosted image (any public URL, e.g. another Shopify CDN file) to a variant. */
export async function attachImageUrlToVariant(
  productId: string,
  variantId: string,
  sourceUrl: string
): Promise<string> {
  const alt = `variant-upload-${variantId.split("/").pop()}-${Date.now()}`;
  const PRODUCT_ADD_MEDIA = `
    mutation ProductAddMedia($product: ProductUpdateInput!, $media: [CreateMediaInput!]) {
      productUpdate(product: $product, media: $media) {
        product {
          media(first: 1, reverse: true) {
            nodes {
              id
              alt
              ... on MediaImage { image { url } }
            }
          }
        }
        userErrors { field message }
      }
    }
  `;
  const mediaRes = await shopifyAdmin<{
    productUpdate: {
      product: { media: { nodes: { id: string; alt: string | null; image?: { url: string } }[] } } | null;
      userErrors: { field: string[]; message: string }[];
    };
  }>(PRODUCT_ADD_MEDIA, {
    product: { id: productId },
    media: [{ originalSource: sourceUrl, mediaContentType: "IMAGE", alt }],
  });
  if (mediaRes.productUpdate.userErrors.length) {
    throw new Error(mediaRes.productUpdate.userErrors.map((e) => e.message).join("; "));
  }
  const newMedia = mediaRes.productUpdate.product?.media.nodes.find((m) => m.alt === alt);
  const mediaId = newMedia?.id;
  if (!mediaId) throw new Error("Shopify did not return the newly created media");

  // Media uploads process asynchronously; Shopify rejects attaching a variant
  // to media that isn't READY yet, so poll status before appending.
  const MEDIA_QUERY = `
    query MediaImageStatus($id: ID!) {
      node(id: $id) {
        ... on MediaImage { status image { url } }
      }
    }
  `;
  let resolvedUrl = "";
  let ready = false;
  for (let attempt = 0; attempt < 10; attempt++) {
    const mediaData = await shopifyAdmin<{ node: { status?: string; image?: { url: string } } | null }>(
      MEDIA_QUERY,
      { id: mediaId }
    );
    if (mediaData.node?.status === "READY") {
      ready = true;
      resolvedUrl = mediaData.node.image?.url ?? "";
      break;
    }
    if (mediaData.node?.status === "FAILED") {
      throw new Error("Shopify failed to process the uploaded image");
    }
    await new Promise((r) => setTimeout(r, 700));
  }
  if (!ready) throw new Error("Image is still processing on Shopify's side — try refreshing shortly");

  const APPEND_MEDIA = `
    mutation AppendVariantMedia($productId: ID!, $variantMedia: [ProductVariantAppendMediaInput!]!) {
      productVariantAppendMedia(productId: $productId, variantMedia: $variantMedia) {
        userErrors { field message }
      }
    }
  `;
  const appendRes = await shopifyAdmin<{
    productVariantAppendMedia: { userErrors: { field: string[]; message: string }[] };
  }>(APPEND_MEDIA, {
    productId,
    variantMedia: [{ variantId, mediaIds: [mediaId] }],
  });
  if (appendRes.productVariantAppendMedia.userErrors.length) {
    throw new Error(appendRes.productVariantAppendMedia.userErrors.map((e) => e.message).join("; "));
  }

  return resolvedUrl;
}

export async function uploadVariantImage(
  productId: string,
  variantId: string,
  file: { filename: string; mimeType: string; size: number; data: Buffer }
): Promise<string> {
  const STAGED_UPLOADS_CREATE = `
    mutation StagedUploadsCreate($input: [StagedUploadInput!]!) {
      stagedUploadsCreate(input: $input) {
        stagedTargets { url resourceUrl parameters { name value } }
        userErrors { field message }
      }
    }
  `;
  const stagedRes = await shopifyAdmin<{
    stagedUploadsCreate: {
      stagedTargets: { url: string; resourceUrl: string; parameters: { name: string; value: string }[] }[];
      userErrors: { field: string[]; message: string }[];
    };
  }>(STAGED_UPLOADS_CREATE, {
    input: [
      {
        resource: "IMAGE",
        filename: file.filename,
        mimeType: file.mimeType,
        httpMethod: "POST",
        fileSize: String(file.size),
      },
    ],
  });
  if (stagedRes.stagedUploadsCreate.userErrors.length) {
    throw new Error(stagedRes.stagedUploadsCreate.userErrors.map((e) => e.message).join("; "));
  }
  const target = stagedRes.stagedUploadsCreate.stagedTargets[0];
  if (!target) throw new Error("Shopify did not return a staged upload target");

  const form = new FormData();
  for (const param of target.parameters) form.append(param.name, param.value);
  form.append("file", new Blob([new Uint8Array(file.data)], { type: file.mimeType }), file.filename);

  const uploadRes = await fetch(target.url, { method: "POST", body: form });
  if (!uploadRes.ok) {
    throw new Error(`Staged upload failed: ${uploadRes.status} ${uploadRes.statusText}`);
  }

  return attachImageUrlToVariant(productId, variantId, target.resourceUrl);
}

// ---------- Orders ----------

export interface AdminOrderJournal {
  title: string;
  imageUrl: string | null;
}

export interface AdminOrder {
  id: string;
  name: string;
  createdAt: string;
  displayFinancialStatus: string;
  displayFulfillmentStatus: string;
  customerName: string | null;
  /** Raw numeric total, in the store's currency — pair with `totalPriceCurrency` to format/convert. */
  totalPriceAmount: number;
  totalPriceCurrency: string;
  /** One entry per journal in the order (grouped by Shopify's native Bundle `lineItemGroup`, or by line title for older/non-bundle orders). */
  journals: AdminOrderJournal[];
  /** Read-only design preview links, one per journal — see the `attributes` note in `cart.ts`. */
  designLinks: string[];
  /**
   * The full customization spec for each journal, decoded straight out of its
   * design link's `d` query param — the link is a self-contained, base64url
   * payload (see `design-link.ts`), so no extra order/line-item data is
   * needed to recover cord/patch/pen holder/notebooks/charms. Index-aligned
   * with `designLinks` (best-effort pairing: both lists are built in the same
   * per-journal order at checkout, but nothing on the Shopify side formally
   * guarantees it for orders with multiple journals). `null` where a link is
   * missing/malformed (e.g. very old pre-design-link orders).
   */
  specs: (JournalSelection | null)[];
}

/** Pulls the `d` payload out of a design link URL and decodes it; tolerant of malformed/legacy links. */
function decodeSpecFromLink(url: string): JournalSelection | null {
  try {
    const d = new URL(url).searchParams.get("d");
    return d ? decodeDesign(d) : null;
  } catch {
    return null;
  }
}

const ORDERS_QUERY = `
  query JournalOrders($cursor: String) {
    orders(first: 25, after: $cursor, reverse: true, sortKey: CREATED_AT) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id
        name
        createdAt
        displayFinancialStatus
        displayFulfillmentStatus
        totalPriceSet { shopMoney { amount currencyCode } }
        customer { displayName }
        customAttributes { key value }
        lineItems(first: 20) {
          nodes {
            title
            quantity
            image { url }
            lineItemGroup { title }
          }
        }
      }
    }
  }
`;

interface RawOrder {
  id: string;
  name: string;
  createdAt: string;
  displayFinancialStatus: string;
  displayFulfillmentStatus: string;
  totalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
  customer: { displayName: string } | null;
  customAttributes: { key: string; value: string }[];
  lineItems: {
    nodes: {
      title: string;
      quantity: number;
      image: { url: string } | null;
      lineItemGroup: { title: string } | null;
    }[];
  };
}

/**
 * The journal variant is configured in Shopify as a native Bundle (cover +
 * cord component products). Once an order is placed, Shopify replaces that
 * one line with separate lines per bundle component — each titled after the
 * *component* product ("Sanaya Component — Cover"/"— Cord"), not the journal.
 * The original bundle product's name only survives on `lineItemGroup.title`,
 * so detection has to check both that and the line's own title (older test
 * orders, or any journal that isn't set up as a Bundle, only have the latter).
 */
function isJournalLine(li: { title: string; lineItemGroup: { title: string } | null }): boolean {
  return /sanaya journal/i.test(li.lineItemGroup?.title ?? li.title);
}

export async function fetchJournalOrders(cursor?: string): Promise<{
  orders: AdminOrder[];
  hasNextPage: boolean;
  endCursor: string | null;
}> {
  const data = await shopifyAdmin<{
    orders: { pageInfo: { hasNextPage: boolean; endCursor: string | null }; nodes: RawOrder[] };
  }>(ORDERS_QUERY, { cursor: cursor ?? null });

  const orders = data.orders.nodes
    .filter((o) => o.lineItems.nodes.some(isJournalLine))
    .map((o) => {
      const journalLines = o.lineItems.nodes.filter(isJournalLine);
      const seenTitles = new Set<string>();
      const journals: AdminOrderJournal[] = [];
      for (const li of journalLines) {
        const title = li.lineItemGroup?.title ?? li.title;
        if (seenTitles.has(title)) continue;
        seenTitles.add(title);
        journals.push({ title, imageUrl: li.image?.url ?? null });
      }

      return {
        id: o.id,
        name: o.name,
        createdAt: o.createdAt,
        displayFinancialStatus: o.displayFinancialStatus,
        displayFulfillmentStatus: o.displayFulfillmentStatus,
        customerName: o.customer?.displayName ?? null,
        totalPriceAmount: Number(o.totalPriceSet.shopMoney.amount),
        totalPriceCurrency: o.totalPriceSet.shopMoney.currencyCode,
        journals,
        // Matched by value (a URL), not by key text — the caption on this
        // attribute (see cart.ts) is customer-facing copy that's changed
        // more than once, so pinning to an exact/prefix key string here just
        // breaks again on the next wording tweak.
        designLinks: o.customAttributes.filter((a) => /^https?:\/\//.test(a.value.trim())).map((a) => a.value),
        specs: o.customAttributes
          .filter((a) => /^https?:\/\//.test(a.value.trim()))
          .map((a) => decodeSpecFromLink(a.value)),
      };
    });

  return { orders, hasNextPage: data.orders.pageInfo.hasNextPage, endCursor: data.orders.pageInfo.endCursor };
}

const ORDER_COUNT_QUERY = `
  query JournalOrderCount($cursor: String) {
    orders(first: 100, after: $cursor, reverse: true, sortKey: CREATED_AT) {
      pageInfo { hasNextPage endCursor }
      nodes {
        lineItems(first: 20) { nodes { title lineItemGroup { title } } }
      }
    }
  }
`;

/**
 * Lightweight count of orders containing at least one journal line item.
 * Caps at 500 scanned orders (5 pages) so a busy store can't turn the
 * dashboard summary card into a slow, unbounded scan — `capped: true` lets
 * the UI show "500+" instead of a wrong exact number past that point.
 */
export async function fetchJournalOrderCount(): Promise<{ count: number; capped: boolean }> {
  let count = 0;
  let cursor: string | undefined;
  for (let page = 0; page < 5; page++) {
    const data = await shopifyAdmin<{
      orders: {
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
        nodes: { lineItems: { nodes: { title: string; lineItemGroup: { title: string } | null }[] } }[];
      };
    }>(ORDER_COUNT_QUERY, { cursor: cursor ?? null });

    count += data.orders.nodes.filter((o) => o.lineItems.nodes.some(isJournalLine)).length;

    if (!data.orders.pageInfo.hasNextPage) return { count, capped: false };
    cursor = data.orders.pageInfo.endCursor ?? undefined;
  }
  return { count, capped: true };
}
