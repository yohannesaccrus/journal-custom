import "server-only";

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
  const data = await shopifyAdmin<{ locations: { nodes: { id: string; name: string }[] } }>(
    `query { locations(first: 5) { nodes { id name } } }`
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

const ASSET_PRODUCTS_QUERY = `
  query AssetProducts($query: String!) {
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
          }
        }
      }
    }
  }
`;

interface RawAssetProduct extends Omit<AdminProduct, "variants"> {
  variants: {
    nodes: (Omit<AdminVariant, "inventoryItemId" | "inventoryQuantity"> & {
      inventoryItem: { id: string };
      inventoryQuantity: number;
    })[];
  };
}

export async function fetchAssetProducts(): Promise<AdminProduct[]> {
  const data = await shopifyAdmin<{ products: { nodes: RawAssetProduct[] } }>(ASSET_PRODUCTS_QUERY, {
    query: "tag:component OR tag:charm OR tag:patch",
  });

  return data.products.nodes.map((p) => ({
    ...p,
    variants: p.variants.nodes.map((v) => ({
      ...v,
      inventoryItemId: v.inventoryItem.id,
      inventoryQuantity: v.inventoryQuantity,
    })),
  }));
}

// ---------- Inventory mutations ----------

export async function setVariantStock(inventoryItemId: string, quantity: number): Promise<void> {
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
}

export async function adjustVariantStock(inventoryItemId: string, delta: number): Promise<void> {
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

export async function updateProductTitle(productId: string, title: string): Promise<void> {
  const MUTATION = `
    mutation UpdateProductTitle($input: ProductUpdateInput!) {
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
        userErrors { field message }
      }
    }
  `;
  const varRes = await shopifyAdmin<{
    productVariantsBulkCreate: { userErrors: { field: string[]; message: string }[] };
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
}

// ---------- Orders ----------

export interface AdminOrderLineItem {
  title: string;
  quantity: number;
  designUrl: string | null;
}

export interface AdminOrder {
  id: string;
  name: string;
  createdAt: string;
  displayFinancialStatus: string;
  displayFulfillmentStatus: string;
  customerName: string | null;
  totalPrice: string;
  lineItems: AdminOrderLineItem[];
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
        lineItems(first: 20) {
          nodes {
            title
            quantity
            customAttributes { key value }
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
  lineItems: {
    nodes: {
      title: string;
      quantity: number;
      customAttributes: { key: string; value: string }[];
    }[];
  };
}

function isJournalLine(title: string): boolean {
  return /sanaya journal/i.test(title);
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
    .filter((o) => o.lineItems.nodes.some((li) => isJournalLine(li.title)))
    .map((o) => ({
      id: o.id,
      name: o.name,
      createdAt: o.createdAt,
      displayFinancialStatus: o.displayFinancialStatus,
      displayFulfillmentStatus: o.displayFulfillmentStatus,
      customerName: o.customer?.displayName ?? null,
      totalPrice: `${o.totalPriceSet.shopMoney.amount} ${o.totalPriceSet.shopMoney.currencyCode}`,
      lineItems: o.lineItems.nodes.map((li) => ({
        title: li.title,
        quantity: li.quantity,
        designUrl: li.customAttributes.find((a) => a.key === "View your custom design")?.value ?? null,
      })),
    }));

  return { orders, hasNextPage: data.orders.pageInfo.hasNextPage, endCursor: data.orders.pageInfo.endCursor };
}
