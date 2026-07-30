import "server-only";
import { decodeDesign } from "@/lib/design-link";
import { COVER_CATEGORY_TAG } from "@/lib/catalog";
import type { JournalSelection } from "@/lib/types";
import type { CoverCategory } from "@/lib/types";

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

// Journal products can now carry Cover×String×Pen Holder×Patch combos (well
// past the old 100-variant cap) — 250 is Shopify's per-page connection max.
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
        variants(first: 250) {
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
    // Shopify returns variants oldest-first; admin tables want the
    // most-recently-added row on top.
    variants: p.variants.nodes
      .map((v) => ({
        ...v,
        inventoryItemId: v.inventoryItem.id,
        inventoryQuantity: v.inventoryQuantity,
        swatchColor: v.swatchMetafield?.value ?? null,
      }))
      .reverse(),
  }));
}

/**
 * The 8 real sellable "tag:journal" cover products — each can carry dozens of
 * String × Pen Holder variant combinations (see `syncJournalOptionAdd`), none
 * of which show up anywhere in Assets & Stock today. Used to power the
 * per-cover accordion on the "Sanaya Component — Cover" card so the admin can
 * actually edit price/SKU/stock for those combos without leaving this page.
 */
export async function fetchJournalCoverProducts(): Promise<AdminProduct[]> {
  const data = await shopifyAdmin<{ products: { nodes: RawAssetProduct[] } }>(ASSET_PRODUCTS_QUERY, {
    query: "tag:journal",
    swatchNamespace: SWATCH_METAFIELD_NAMESPACE,
    swatchKey: SWATCH_METAFIELD_KEY,
  });

  return data.products.nodes
    .map((p) => ({
      ...p,
      // Shopify returns variants oldest-first; the per-cover combo table
      // wants the most-recently-added combo on top.
      variants: p.variants.nodes
        .map((v) => ({
          ...v,
          inventoryItemId: v.inventoryItem.id,
          inventoryQuantity: v.inventoryQuantity,
          swatchColor: v.swatchMetafield?.value ?? null,
        }))
        .reverse(),
    }))
    .reverse();
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
 * Some internal component products (Cover, String, Pen Holder, Patch) exist
 * purely for admin stock/price tracking, but the customer-facing customizer
 * actually reads its option labels from the separate sellable "tag:journal"
 * products. Renaming a component variant would otherwise silently desync
 * from what customers see, so mirror the rename onto every matching journal
 * option value. Charm/Notebook components are the same product the customer
 * sees (no separate sellable copy), so they never need this.
 *
 * Note: this used to be called "Cord" everywhere (option name, product tag,
 * SKUs) — fully renamed to "String" as of 2026-07-29. The component
 * product's handle (`sanaya-component-cord`) is the one thing left alone,
 * since changing it would break any existing links/references to that URL.
 *
 * Patch has no option of its own on the journal product (Shopify caps
 * products at 3 options, already used by Cover/String/Pen Holder) — it's
 * encoded as a "<cord> + <patch>" suffix on String's own values instead
 * (see `stringValueFor` in catalog.ts). So renaming a cord (tag "string")
 * must also rename every "<oldName> + <patch>" value alongside it, and
 * renaming a patch shape (tag "patch") must rename "<cord> + <oldName>" to
 * "<cord> + <newName>" across every cord that has one.
 */
export async function syncJournalOptionRename(
  componentTags: string[],
  oldName: string,
  newName: string
): Promise<void> {
  const tag = componentTags.find((t) => t === "cover" || t === "string" || t === "pen-holder" || t === "patch");
  if (!tag || oldName === newName) return;

  const optionName = tag === "pen-holder" ? "Pen Holder" : tag === "cover" ? "Cover" : "String";

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

  for (const product of data.products.nodes) {
    const option = product.options.find((o) => o.name === optionName);
    if (!option) continue;

    const updates: { id: string; name: string }[] = [];
    for (const value of option.optionValues) {
      if (tag === "pen-holder") {
        if (value.name === oldName) updates.push({ id: value.id, name: newName });
        else if (value.name === `${oldName} + Edge`) updates.push({ id: value.id, name: `${newName} + Edge` });
      } else if (tag === "cover") {
        if (value.name === oldName) updates.push({ id: value.id, name: newName });
      } else if (tag === "string") {
        if (value.name === oldName) updates.push({ id: value.id, name: newName });
        else if (value.name.startsWith(`${oldName} + `)) {
          updates.push({ id: value.id, name: value.name.replace(`${oldName} + `, `${newName} + `) });
        }
      } else {
        // tag === "patch"
        if (value.name.endsWith(` + ${oldName}`)) {
          updates.push({ id: value.id, name: value.name.replace(new RegExp(` \\+ ${oldName}$`), ` + ${newName}`) });
        }
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

/**
 * Mirrors the SKU pattern already used on real journal variants, e.g.
 * `SANAYA-JRN-CLASSIC-BROWN-STRING-ORANGE-PH-BLACK-EDGE`. `cord` may itself
 * carry a patch suffix (e.g. "Orange + Star" -- see `stringValueFor` in
 * catalog.ts), which `slug()` already turns into `-ORANGE-STAR` for free.
 */
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
  if (errs.length) throw new Error(`Create combo variants: ${errs.map((e) => e.message).join("; ")}`);

  // So the admin can set opening stock per cover in Shopify right away,
  // instead of hitting the same "not stocked at the location" error there
  // too. Parallelized -- a migration/bulk-add can create hundreds of
  // variants at once, and activating them one at a time would take minutes
  // (and risk a serverless timeout).
  await Promise.all(
    data.productVariantsBulkCreate.productVariants.map((v) => activateInventoryAtPrimaryLocation(v.inventoryItem.id))
  );

  return combos.length;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Unlike String/Pen Holder (which are just an option value added onto
 * already-existing sellable products), a new Cover has no product to attach
 * to yet -- this creates a brand-new "tag:journal" product from scratch,
 * with every valid String x Pen Holder combination that already exists
 * elsewhere in the catalog (copied from an existing journal product's
 * option values, so a new String/Pen Holder color -- or Patch shape --
 * added earlier is automatically included). Patch is encoded as a suffix on
 * String's own values ("Light Pink + Star") rather than its own option --
 * Shopify caps products at 3 options total, and Cover/String/Pen Holder
 * already use all 3 (see `stringValueFor` in catalog.ts). Category
 * ("classic" vs "pattern") is persisted as a `category:*` tag -- see
 * `COVER_CATEGORY_TAG` in catalog.ts -- so it can be set here without a
 * code change. New variants start at 0 stock and get a price from
 * `syncJournalPricing` (base = this cover's own price, same additive model
 * as every other cover) -- call that right after this returns.
 */
export async function createJournalCoverProduct(
  style: string,
  price: string,
  category: CoverCategory
): Promise<{ productId: string; handle: string; created: number }> {
  const REF_QUERY = `
    query JournalCoverReference {
      products(first: 1, query: "tag:journal") {
        nodes {
          options { name optionValues { name } }
        }
      }
    }
  `;
  const ref = await shopifyAdmin<{
    products: { nodes: { options: { name: string; optionValues: { name: string }[] }[] }[] };
  }>(REF_QUERY);
  const refProduct = ref.products.nodes[0];
  if (!refProduct) throw new Error("No existing journal product found to copy String/Pen Holder options from");

  const stringValues = refProduct.options.find((o) => o.name === "String")?.optionValues.map((v) => v.name) ?? [];
  const penHolderValues =
    refProduct.options.find((o) => o.name === "Pen Holder")?.optionValues.map((v) => v.name) ?? [];
  if (stringValues.length === 0 || penHolderValues.length === 0) {
    throw new Error("Reference journal product is missing String/Pen Holder option values");
  }

  const handle = `sanaya-journal-${slugify(style)}`;

  // A previous attempt at this same style may have died partway through and
  // left a broken product squatting on this handle (rollback only covers
  // failures *after* this function creates the product -- not a process
  // that got interrupted, or ran before rollback existed). If it's
  // genuinely broken (no "No Cord"/"None" base variant), clear it out
  // automatically instead of making the admin hunt it down in Shopify by
  // hand; if it's a real, complete cover, this is a genuine name clash --
  // fail with a clear message instead.
  const EXISTING_QUERY = `
    query JournalCoverHandleCheck($query: String!) {
      products(first: 1, query: $query) {
        nodes {
          id
          variants(first: 250) { nodes { selectedOptions { name value } } }
        }
      }
    }
  `;
  const existing = await shopifyAdmin<{
    products: { nodes: { id: string; variants: { nodes: { selectedOptions: { name: string; value: string }[] }[] } }[] };
  }>(EXISTING_QUERY, { query: `handle:${handle}` });
  const existingProduct = existing.products.nodes[0];
  if (existingProduct) {
    const hasBase = existingProduct.variants.nodes.some(
      (v) =>
        v.selectedOptions.some((o) => o.name === "String" && o.value === "No Cord") &&
        v.selectedOptions.some((o) => o.name === "Pen Holder" && o.value === "None")
    );
    if (hasBase) {
      throw new Error(`A cover named "${style}" already exists -- choose a different name.`);
    }
    await deleteProduct(existingProduct.id);
  }

  // Step 1: create the product with only its Cover option -- guarantees
  // exactly one default variant, no ambiguity about auto-generated combos.
  const PRODUCT_CREATE = `
    mutation CreateJournalCover($product: ProductCreateInput!) {
      productCreate(product: $product) {
        product { id handle }
        userErrors { field message }
      }
    }
  `;
  const createRes = await shopifyAdmin<{
    productCreate: {
      product: { id: string; handle: string } | null;
      userErrors: { field: string[]; message: string }[];
    };
  }>(PRODUCT_CREATE, {
    product: {
      title: `Sanaya Journal -- ${style}`,
      handle,
      tags: ["journal", COVER_CATEGORY_TAG[category]],
      productOptions: [{ name: "Cover", values: [{ name: style }] }],
    },
  });
  const createErrs = createRes.productCreate.userErrors;
  if (createErrs.length) throw new Error(`Create product: ${createErrs.map((e) => e.message).join("; ")}`);
  const productId = createRes.productCreate.product?.id;
  if (!productId) throw new Error("Shopify did not return the created product");

  try {
    return await finishJournalCoverProduct(productId, handle, style, price, stringValues, penHolderValues);
  } catch (err) {
    // Anything short of a fully-formed base ("No Cord" / "None") variant
    // would otherwise sit around tagged "journal" and crash the whole
    // storefront build (catalog.ts requires every journal product to have
    // one) -- better to undo the partial product than leave debris behind.
    await deleteProduct(productId).catch(() => {});
    throw err;
  }
}

async function deleteProduct(productId: string): Promise<void> {
  const MUTATION = `
    mutation DeleteJournalCoverProduct($input: ProductDeleteInput!) {
      productDelete(input: $input) {
        userErrors { field message }
      }
    }
  `;
  const data = await shopifyAdmin<{
    productDelete: { userErrors: { field: string[]; message: string }[] };
  }>(MUTATION, { input: { id: productId } });
  const errs = data.productDelete.userErrors;
  if (errs.length) throw new Error(errs.map((e) => e.message).join("; "));
}

async function finishJournalCoverProduct(
  productId: string,
  handle: string,
  style: string,
  price: string,
  stringValues: string[],
  penHolderValues: string[]
): Promise<{ productId: string; handle: string; created: number }> {
  // Step 2: add String and Pen Holder as brand-new options on that product --
  // productOptionsCreate is the dedicated mutation for adding options after
  // creation (productOptionUpdate, used elsewhere in this file, only adds
  // values to an option that already exists, and can't create a new one).
  const OPTIONS_CREATE = `
    mutation AddCoverOptions($productId: ID!, $options: [OptionCreateInput!]!) {
      productOptionsCreate(productId: $productId, options: $options) {
        userErrors { field message }
      }
    }
  `;
  const optionsRes = await shopifyAdmin<{
    productOptionsCreate: { userErrors: { field: string[]; message: string }[] };
  }>(OPTIONS_CREATE, {
    productId,
    options: [
      { name: "String", values: stringValues.map((name) => ({ name })) },
      { name: "Pen Holder", values: penHolderValues.map((name) => ({ name })) },
    ],
  });
  const optionsErrs = optionsRes.productOptionsCreate.userErrors;
  if (optionsErrs.length) throw new Error(`Add String/Pen Holder options: ${optionsErrs.map((e) => e.message).join("; ")}`);

  // Re-fetch fresh -- both steps above may have auto-generated placeholder
  // variants for the option value combinations Shopify computed on its own,
  // which don't necessarily match the valid combo rule this catalog uses.
  const STATE_QUERY = `
    query JournalCoverState($id: ID!) {
      node(id: $id) {
        ... on Product {
          options { id name optionValues { id name } }
          variants(first: 250) { nodes { id selectedOptions { name value } } }
        }
      }
    }
  `;
  const state = await shopifyAdmin<{
    node: {
      options: { id: string; name: string; optionValues: { id: string; name: string }[] }[];
      variants: { nodes: { id: string; selectedOptions: { name: string; value: string }[] }[] };
    } | null;
  }>(STATE_QUERY, { id: productId });
  if (!state.node) throw new Error("Shopify did not return the product after adding options");

  const coverOption = state.node.options.find((o) => o.name === "Cover");
  const cordOption = state.node.options.find((o) => o.name === "String");
  const penOption = state.node.options.find((o) => o.name === "Pen Holder");
  if (!coverOption || !cordOption || !penOption) throw new Error("Created product is missing an expected option");

  // Same combo rule as syncJournalOptionAdd: any String value (a base cord,
  // or "<cord> + <patch>") pairs with every pen holder value including
  // "None"; "No Cord" only ever pairs with "None".
  const combos: { cord: string; pen: string }[] = [];
  for (const cord of stringValues) {
    if (cord === "No Cord") {
      combos.push({ cord, pen: "None" });
    } else {
      for (const pen of penHolderValues) combos.push({ cord, pen });
    }
  }
  const comboKey = (cord: string, pen: string) => `${cord} ${pen}`;
  const validKeys = new Set(combos.map((c) => comboKey(c.cord, c.pen)));

  // Shopify auto-generates the full cartesian product across both options
  // as placeholder variants once they exist -- that includes invalid combos
  // (e.g. "No Cord" + a real pen holder) this catalog never allows. Only
  // delete those; NEVER delete every variant in one call -- wiping a
  // product down to zero variants can make Shopify drop the options
  // themselves too, which then breaks the variant-create call right after
  // with "Option does not exist". Valid placeholders are updated in place
  // (price + SKU) instead of being replaced.
  const toDelete: string[] = [];
  const existingValidKeys = new Set<string>();
  const toUpdate: { id: string; price: string; sku: string }[] = [];
  for (const v of state.node.variants.nodes) {
    const cord = v.selectedOptions.find((o) => o.name === "String")?.value;
    const pen = v.selectedOptions.find((o) => o.name === "Pen Holder")?.value;
    const key = cord && pen ? comboKey(cord, pen) : null;
    if (key && validKeys.has(key)) {
      existingValidKeys.add(key);
      toUpdate.push({ id: v.id, price, sku: journalSku(handle, cord!, pen!) });
    } else {
      toDelete.push(v.id);
    }
  }

  if (toUpdate.length > 0) {
    const UPDATE_MUTATION = `
      mutation UpdateCoverPlaceholders($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
        productVariantsBulkUpdate(productId: $productId, variants: $variants) {
          userErrors { field message }
        }
      }
    `;
    for (let i = 0; i < toUpdate.length; i += 100) {
      const chunk = toUpdate.slice(i, i + 100);
      const updRes = await shopifyAdmin<{
        productVariantsBulkUpdate: { userErrors: { field: string[]; message: string }[] };
      }>(UPDATE_MUTATION, {
        productId,
        variants: chunk.map((v) => ({ id: v.id, price: v.price, inventoryItem: { sku: v.sku } })),
      });
      const updErrs = updRes.productVariantsBulkUpdate.userErrors;
      if (updErrs.length) throw new Error(`Update combo variants: ${updErrs.map((e) => e.message).join("; ")}`);
    }
  }

  // Create any valid combo Shopify didn't already generate a placeholder for
  // BEFORE deleting the invalid ones below -- so the product always has at
  // least one valid variant, and is never briefly reduced to zero.
  const missingCombos = combos.filter((c) => !existingValidKeys.has(comboKey(c.cord, c.pen)));
  const created = await bulkCreateJournalVariants(
    productId,
    handle,
    coverOption.id,
    style,
    cordOption.id,
    penOption.id,
    missingCombos,
    price
  );

  if (toDelete.length > 0) {
    const DELETE_MUTATION = `
      mutation DeleteInvalidComboVariants($productId: ID!, $variantsIds: [ID!]!) {
        productVariantsBulkDelete(productId: $productId, variantsIds: $variantsIds) {
          userErrors { field message }
        }
      }
    `;
    for (let i = 0; i < toDelete.length; i += 100) {
      const chunk = toDelete.slice(i, i + 100);
      const delRes = await shopifyAdmin<{
        productVariantsBulkDelete: { userErrors: { field: string[]; message: string }[] };
      }>(DELETE_MUTATION, { productId, variantsIds: chunk });
      const delErrs = delRes.productVariantsBulkDelete.userErrors;
      if (delErrs.length) throw new Error(`Delete invalid combo variants: ${delErrs.map((e) => e.message).join("; ")}`);
    }
  }

  return { productId, handle, created: created + toUpdate.length };
}

/**
 * The counterpart to `syncJournalOptionRename` for brand-new String colors,
 * Pen Holder colors, and Patch shapes: the "+Add variant" button on the
 * matching internal component product only adds a variant *there* (for
 * stock/price tracking) -- customers can't actually pick the new value
 * anywhere until it also exists as a real option value + variant on every
 * sellable "tag:journal" cover product. Patch has no option of its own
 * (Shopify caps products at 3 options, already used by Cover/String/Pen
 * Holder) -- it's encoded as a "<cord> + <patch>" suffix on String's own
 * values instead (see `stringValueFor` in catalog.ts), so adding a new
 * String color also creates its patch-suffixed forms, and adding a new
 * Patch shape adds a suffixed value for every real cord that already exists.
 * New variants copy the price of that cover's existing variants and start
 * at 0 stock -- the admin still sets opening stock per cover directly in
 * Shopify (these combo variants aren't shown in Assets & Stock).
 */
export async function syncJournalOptionAdd(componentTags: string[], newValue: string): Promise<JournalSyncResult[]> {
  const tag = componentTags.find((t) => t === "string" || t === "pen-holder" || t === "patch");
  if (!tag) return [];

  let realPatchLabels: string[] = [];
  if (tag === "string") {
    const patchRef = await shopifyAdmin<{
      products: { nodes: { variants: { nodes: { title: string }[] } }[] };
    }>(`query PatchTrackerForAddSync { products(first: 1, query: "tag:patch") { nodes { variants(first: 50) { nodes { title } } } } }`);
    realPatchLabels = patchRef.products.nodes[0]?.variants.nodes.map((v) => v.title) ?? [];
  }

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
    // Real (non "No Cord", non patch-suffixed) cord colors currently on this cover.
    const baseCords = cordOption.optionValues.map((v) => v.name).filter((v) => v !== "No Cord" && !v.includes(" + "));

    try {
      if (tag === "string") {
        if (cordOption.optionValues.some((v) => v.name === newValue)) {
          results.push({ coverHandle: product.handle, coverTitle: product.title, created: 0, skipped: true });
          continue;
        }
        // A new cord needs its plain form AND every "<cord> + <patch>" form.
        const newStringValues = [newValue, ...realPatchLabels.map((p) => `${newValue} + ${p}`)];
        await addOptionValues(product.id, cordOption.id, newStringValues);
        const penValues = penOption.optionValues.map((v) => v.name);
        const combos = newStringValues.flatMap((cord) => penValues.map((pen) => ({ cord, pen })));
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
      } else if (tag === "pen-holder") {
        const edgeValue = `${newValue} + Edge`;
        if (penOption.optionValues.some((v) => v.name === newValue || v.name === edgeValue)) {
          results.push({ coverHandle: product.handle, coverTitle: product.title, created: 0, skipped: true });
          continue;
        }
        await addOptionValues(product.id, penOption.id, [newValue, edgeValue]);
        // Every non-"No Cord" String value (base cords AND their
        // patch-suffixed forms) is a valid pairing.
        const cordValues = cordOption.optionValues.map((v) => v.name).filter((v) => v !== "No Cord");
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
      } else {
        // tag === "patch" -- a new shape needs a "<cord> + <newValue>" String
        // value for every real base cord that doesn't already have one.
        const missingCords = baseCords.filter((cord) => !cordOption.optionValues.some((v) => v.name === `${cord} + ${newValue}`));
        if (missingCords.length === 0) {
          results.push({ coverHandle: product.handle, coverTitle: product.title, created: 0, skipped: true });
          continue;
        }
        const newStringValues = missingCords.map((cord) => `${cord} + ${newValue}`);
        await addOptionValues(product.id, cordOption.id, newStringValues);
        const penValues = penOption.optionValues.map((v) => v.name);
        const combos = newStringValues.flatMap((cord) => penValues.map((pen) => ({ cord, pen })));
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

/**
 * Additive pricing model: Cover/String/Pen Holder/Patch tracker products
 * each carry their own `price` per option value -- Cover's is the base
 * price for that cover (same for every combo), String/Pen Holder/Patch's
 * are pure add-on deltas on top of it ("No Cord"/"None" always contribute
 * 0, since they're the zero-cost default option, not a tracked variant).
 * Patch has no option of its own on the journal product (see
 * `stringValueFor` in catalog.ts) -- its delta is read off the "<cord> +
 * <patch>" suffix on the String option's own value instead.
 */
async function fetchPriceComponents(): Promise<{
  coverPrice: Record<string, number>;
  stringDelta: Record<string, number>;
  penHolderDelta: Record<string, number>;
  patchDelta: Record<string, number>;
}> {
  const data = await shopifyAdmin<{
    products: { nodes: { tags: string[]; variants: { nodes: { title: string; price: string }[] } }[] };
  }>(
    `query PriceComponents {
      products(first: 20, query: "tag:cover OR tag:string OR tag:pen-holder OR tag:patch") {
        nodes {
          tags
          variants(first: 100) { nodes { title price } }
        }
      }
    }`
  );

  const coverPrice: Record<string, number> = {};
  const stringDelta: Record<string, number> = { "No Cord": 0 };
  // "+ Edge" combos aren't tracked as separate pen-holder rows -- they carry
  // the same add-on price as their plain counterpart.
  const penHolderDelta: Record<string, number> = { None: 0 };
  const patchDelta: Record<string, number> = { None: 0 };

  for (const product of data.products.nodes) {
    if (product.tags.includes("cover")) {
      for (const v of product.variants.nodes) coverPrice[v.title] = Number(v.price);
    } else if (product.tags.includes("string")) {
      for (const v of product.variants.nodes) stringDelta[v.title] = Number(v.price);
    } else if (product.tags.includes("pen-holder")) {
      for (const v of product.variants.nodes) {
        penHolderDelta[v.title] = Number(v.price);
        penHolderDelta[`${v.title} + Edge`] = Number(v.price);
      }
    } else if (product.tags.includes("patch")) {
      for (const v of product.variants.nodes) patchDelta[v.title] = Number(v.price);
    }
  }
  return { coverPrice, stringDelta, penHolderDelta, patchDelta };
}

/**
 * Recomputes every real (Cover x String[+ Patch] x Pen Holder) journal
 * variant's price as `coverPrice + stringDelta + penHolderDelta +
 * patchDelta` from the four tracker products' own per-option prices, and
 * pushes any changed prices to Shopify. Call this any time a Cover/String/Pen
 * Holder/Patch tracker price changes, or a new color/patch is synced onto
 * the journal products.
 */
export async function syncJournalPricing(): Promise<void> {
  const { coverPrice, stringDelta, penHolderDelta, patchDelta } = await fetchPriceComponents();

  const JOURNAL_QUERY = `
    query JournalPricingSync {
      products(first: 20, query: "tag:journal") {
        nodes {
          id
          variants(first: 250) {
            nodes { id price selectedOptions { name value } }
          }
        }
      }
    }
  `;
  const data = await shopifyAdmin<{
    products: {
      nodes: {
        id: string;
        variants: { nodes: { id: string; price: string; selectedOptions: { name: string; value: string }[] }[] };
      }[];
    };
  }>(JOURNAL_QUERY);

  const MUTATION = `
    mutation SyncJournalPrices($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        userErrors { field message }
      }
    }
  `;

  for (const product of data.products.nodes) {
    const updates: { id: string; price: string }[] = [];
    for (const v of product.variants.nodes) {
      const cover = v.selectedOptions.find((o) => o.name === "Cover")?.value;
      if (!cover || !(cover in coverPrice)) continue;
      const stringValue = v.selectedOptions.find((o) => o.name === "String")?.value ?? "";
      const penHolderValue = v.selectedOptions.find((o) => o.name === "Pen Holder")?.value;
      // "<cord> + <patch>" suffix -- see `stringValueFor` in catalog.ts.
      const plusIndex = stringValue.indexOf(" + ");
      const baseCord = plusIndex === -1 ? stringValue : stringValue.slice(0, plusIndex);
      const patchLabel = plusIndex === -1 ? "None" : stringValue.slice(plusIndex + 3);
      const delta =
        (stringDelta[baseCord] ?? 0) +
        (penHolderValue ? penHolderDelta[penHolderValue] ?? 0 : 0) +
        (patchDelta[patchLabel] ?? 0);
      const newPrice = (coverPrice[cover] + delta).toFixed(2);
      if (newPrice !== Number(v.price).toFixed(2)) updates.push({ id: v.id, price: newPrice });
    }
    if (updates.length === 0) continue;
    for (let i = 0; i < updates.length; i += 100) {
      const chunk = updates.slice(i, i + 100);
      const res = await shopifyAdmin<{
        productVariantsBulkUpdate: { userErrors: { field: string[]; message: string }[] };
      }>(MUTATION, { productId: product.id, variants: chunk });
      const errs = res.productVariantsBulkUpdate.userErrors;
      if (errs.length) throw new Error(errs.map((e) => e.message).join("; "));
    }
  }
}

/** Stands in for "this combo doesn't consume this component" (e.g. "No Cord", "None", no patch) in the `Math.min` below, so a combo is never capped by a component it doesn't actually use. */
const UNLIMITED_STOCK = 1_000_000;

/**
 * Raw-material stock for each of the five component trackers (Cover,
 * String, Pen Holder, Corner Edge, Patch) — these are physical materials
 * shared across every combo that uses them (e.g. one roll of Orange string
 * is shared by all 9 covers), unlike price, which is a per-value add-on.
 * Corner Edge has a single variant (a yes/no add-on kit), so its stock is
 * one number rather than a per-value map.
 */
async function fetchStockComponents(): Promise<{
  coverStock: Record<string, number>;
  stringStock: Record<string, number>;
  penHolderStock: Record<string, number>;
  patchStock: Record<string, number>;
  edgeStock: number | null;
}> {
  const data = await shopifyAdmin<{
    products: { nodes: { tags: string[]; variants: { nodes: { title: string; inventoryQuantity: number }[] } }[] };
  }>(
    `query StockComponents {
      products(first: 20, query: "tag:cover OR tag:string OR tag:pen-holder OR tag:patch OR tag:edge") {
        nodes {
          tags
          variants(first: 100) { nodes { title inventoryQuantity } }
        }
      }
    }`
  );

  const coverStock: Record<string, number> = {};
  const stringStock: Record<string, number> = {};
  const penHolderStock: Record<string, number> = {};
  const patchStock: Record<string, number> = {};
  let edgeStock: number | null = null;

  for (const product of data.products.nodes) {
    if (product.tags.includes("cover")) {
      for (const v of product.variants.nodes) coverStock[v.title] = v.inventoryQuantity;
    } else if (product.tags.includes("edge")) {
      edgeStock = product.variants.nodes[0]?.inventoryQuantity ?? null;
    } else if (product.tags.includes("string")) {
      for (const v of product.variants.nodes) stringStock[v.title] = v.inventoryQuantity;
    } else if (product.tags.includes("pen-holder")) {
      for (const v of product.variants.nodes) penHolderStock[v.title] = v.inventoryQuantity;
    } else if (product.tags.includes("patch")) {
      for (const v of product.variants.nodes) patchStock[v.title] = v.inventoryQuantity;
    }
  }
  return { coverStock, stringStock, penHolderStock, patchStock, edgeStock };
}

export interface JournalStockResult {
  coverHandle: string;
  coverTitle: string;
  updated: number;
  skipped: boolean;
  error?: string;
}

/**
 * Recomputes every real (Cover x String[+ Patch] x Pen Holder[+ Edge])
 * journal variant's purchasable stock as `Math.min` of the raw-material
 * stock of every component it consumes, and pushes any changed quantities
 * to Shopify. Call this any time a Cover/String/Pen Holder/Corner Edge/Patch
 * tracker's own stock changes — a single shared material (e.g. Orange
 * string) running out must zero out every combo that uses it, across all 9
 * covers, not just one row.
 */
export async function syncJournalStock(): Promise<JournalStockResult[]> {
  const { coverStock, stringStock, penHolderStock, patchStock, edgeStock } = await fetchStockComponents();
  const locationId = await getPrimaryLocationId();

  const JOURNAL_QUERY = `
    query JournalStockSync {
      products(first: 20, query: "tag:journal") {
        nodes {
          id
          handle
          title
          variants(first: 250) {
            nodes {
              inventoryQuantity
              inventoryItem { id }
              selectedOptions { name value }
            }
          }
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
        variants: {
          nodes: {
            inventoryQuantity: number;
            inventoryItem: { id: string };
            selectedOptions: { name: string; value: string }[];
          }[];
        };
      }[];
    };
  }>(JOURNAL_QUERY);

  const results: JournalStockResult[] = [];

  for (const product of data.products.nodes) {
    const quantities: { inventoryItemId: string; locationId: string; quantity: number }[] = [];
    let skippedAny = false;

    for (const v of product.variants.nodes) {
      const cover = v.selectedOptions.find((o) => o.name === "Cover")?.value;
      if (!cover || !(cover in coverStock)) {
        skippedAny = true;
        continue;
      }
      const stringValue = v.selectedOptions.find((o) => o.name === "String")?.value ?? "No Cord";
      const penHolderValue = v.selectedOptions.find((o) => o.name === "Pen Holder")?.value ?? "None";

      // "<cord> + <patch>" suffix -- see `stringValueFor` in catalog.ts.
      const plusIndex = stringValue.indexOf(" + ");
      const baseCord = plusIndex === -1 ? stringValue : stringValue.slice(0, plusIndex);
      const patchLabel = plusIndex === -1 ? "None" : stringValue.slice(plusIndex + 3);

      const hasEdge = penHolderValue.endsWith(" + Edge");
      const basePen = hasEdge ? penHolderValue.slice(0, -" + Edge".length) : penHolderValue;

      const cordAvail = baseCord === "No Cord" ? UNLIMITED_STOCK : stringStock[baseCord] ?? 0;
      const penAvail = basePen === "None" ? UNLIMITED_STOCK : penHolderStock[basePen] ?? 0;
      const edgeAvail = hasEdge ? edgeStock ?? 0 : UNLIMITED_STOCK;
      const patchAvail = patchLabel === "None" ? UNLIMITED_STOCK : patchStock[patchLabel] ?? 0;

      const computed = Math.min(coverStock[cover], cordAvail, penAvail, edgeAvail, patchAvail);
      if (computed !== v.inventoryQuantity) {
        quantities.push({ inventoryItemId: v.inventoryItem.id, locationId, quantity: computed });
      }
    }

    if (quantities.length === 0) {
      results.push({ coverHandle: product.handle, coverTitle: product.title, updated: 0, skipped: skippedAny });
      continue;
    }

    try {
      const MUTATION = `
        mutation SyncJournalStock($input: InventorySetQuantitiesInput!) {
          inventorySetQuantities(input: $input) {
            userErrors { field message }
          }
        }
      `;
      for (let i = 0; i < quantities.length; i += 100) {
        const chunk = quantities.slice(i, i + 100);
        const res = await shopifyAdmin<{
          inventorySetQuantities: { userErrors: { field: string[]; message: string }[] };
        }>(MUTATION, {
          input: { name: "available", reason: "correction", ignoreCompareQuantity: true, quantities: chunk },
        });
        const errs = res.inventorySetQuantities.userErrors;
        if (errs.length) throw new Error(errs.map((e) => e.message).join("; "));
      }
      results.push({ coverHandle: product.handle, coverTitle: product.title, updated: quantities.length, skipped: false });
    } catch (err) {
      results.push({
        coverHandle: product.handle,
        coverTitle: product.title,
        updated: 0,
        skipped: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return results;
}

export interface JournalDeleteResult {
  coverHandle: string;
  coverTitle: string;
  removed: number;
  skipped: boolean;
  error?: string;
}

/**
 * The delete counterpart to `syncJournalOptionAdd`: removing a String/Pen
 * Holder/Patch value from its tracker product only deletes that bookkeeping
 * row — customers could still pick it and orders could still price it at
 * Rp0 (see `syncJournalPricing`'s fallback) unless the option value(s) and
 * their combo variants are also removed from every real "tag:journal"
 * product. Deletes every matching variant first, then removes the option
 * value(s) themselves. Pen Holder also removes the paired "<value> + Edge"
 * combo. Patch has no option of its own (see `stringValueFor` in
 * catalog.ts) — removing a shape removes every "<cord> + <value>" String
 * value across every cord; removing a cord (tag "string") removes its plain
 * form AND every "<value> + <patch>" form alongside it.
 */
export async function syncJournalOptionDelete(componentTags: string[], value: string): Promise<JournalDeleteResult[]> {
  const tag = componentTags.find((t) => t === "string" || t === "pen-holder" || t === "patch");
  if (!tag) return [];

  const optionName = tag === "pen-holder" ? "Pen Holder" : "String";

  const JOURNAL_PRODUCTS_QUERY = `
    query JournalProductsForDeleteSync {
      products(first: 20, query: "tag:journal") {
        nodes {
          id
          handle
          title
          options { id name optionValues { id name } }
          variants(first: 250) { nodes { id selectedOptions { name value } } }
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
        variants: { nodes: { id: string; selectedOptions: { name: string; value: string }[] }[] };
      }[];
    };
  }>(JOURNAL_PRODUCTS_QUERY);

  const results: JournalDeleteResult[] = [];

  for (const product of data.products.nodes) {
    const option = product.options.find((o) => o.name === optionName);
    const valuesToRemove =
      tag === "pen-holder"
        ? [value, `${value} + Edge`]
        : tag === "string"
          ? (option?.optionValues.map((v) => v.name).filter((n) => n === value || n.startsWith(`${value} + `)) ?? [])
          : (option?.optionValues.map((v) => v.name).filter((n) => n.endsWith(` + ${value}`)) ?? []);
    const optionValueIds = option?.optionValues.filter((v) => valuesToRemove.includes(v.name)).map((v) => v.id) ?? [];
    if (!option || optionValueIds.length === 0) {
      results.push({ coverHandle: product.handle, coverTitle: product.title, removed: 0, skipped: true });
      continue;
    }

    try {
      const variantIds = product.variants.nodes
        .filter((v) => v.selectedOptions.some((o) => o.name === optionName && valuesToRemove.includes(o.value)))
        .map((v) => v.id);

      if (variantIds.length > 0) {
        const DELETE_VARIANTS = `
          mutation DeleteJournalCombos($productId: ID!, $variantsIds: [ID!]!) {
            productVariantsBulkDelete(productId: $productId, variantsIds: $variantsIds) {
              userErrors { field message }
            }
          }
        `;
        for (let i = 0; i < variantIds.length; i += 100) {
          const chunk = variantIds.slice(i, i + 100);
          const delRes = await shopifyAdmin<{
            productVariantsBulkDelete: { userErrors: { field: string[]; message: string }[] };
          }>(DELETE_VARIANTS, { productId: product.id, variantsIds: chunk });
          const delErrs = delRes.productVariantsBulkDelete.userErrors;
          if (delErrs.length) throw new Error(delErrs.map((e) => e.message).join("; "));
        }
      }

      const DELETE_OPTION_VALUES = `
        mutation DeleteOptionValues($productId: ID!, $option: OptionUpdateInput!, $optionValuesToDelete: [ID!]) {
          productOptionUpdate(productId: $productId, option: $option, optionValuesToDelete: $optionValuesToDelete) {
            userErrors { field message }
          }
        }
      `;
      const optRes = await shopifyAdmin<{
        productOptionUpdate: { userErrors: { field: string[]; message: string }[] };
      }>(DELETE_OPTION_VALUES, {
        productId: product.id,
        option: { id: option.id },
        optionValuesToDelete: optionValueIds,
      });
      const optErrs = optRes.productOptionUpdate.userErrors;
      if (optErrs.length) throw new Error(optErrs.map((e) => e.message).join("; "));

      results.push({ coverHandle: product.handle, coverTitle: product.title, removed: variantIds.length, skipped: false });
    } catch (err) {
      results.push({
        coverHandle: product.handle,
        coverTitle: product.title,
        removed: 0,
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
