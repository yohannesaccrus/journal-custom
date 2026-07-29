import "server-only";

const STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const ACCESS_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const API_VERSION = process.env.SHOPIFY_ADMIN_API_VERSION ?? "2026-01";

export interface ShopifyVariant {
  id: string;
  title: string;
  price: string;
  sku: string;
  image: { url: string } | null;
  selectedOptions: { name: string; value: string }[];
  inventoryQuantity: number;
}

export interface ShopifyMedia {
  alt: string;
  url: string;
}

export interface ShopifyJournalProduct {
  id: string;
  handle: string;
  title: string;
  tags: string[];
  variants: ShopifyVariant[];
  /** Extra product media not tied to a specific variant — e.g. the generated back/side charm-placement views. */
  media: ShopifyMedia[];
}

const PRODUCTS_QUERY = `
  query Products($query: String!) {
    products(first: 20, query: $query) {
      nodes {
        id
        handle
        title
        tags
        variants(first: 40) {
          nodes {
            id
            title
            price
            sku
            image { url }
            selectedOptions { name value }
            inventoryQuantity
          }
        }
        media(first: 150) {
          nodes {
            alt
            ... on MediaImage { image { url } }
          }
        }
      }
    }
  }
`;

interface RawProduct extends Omit<ShopifyJournalProduct, "variants" | "media"> {
  variants: { nodes: ShopifyVariant[] };
  media: { nodes: { alt: string | null; image?: { url: string } }[] };
}

async function fetchProducts(query: string): Promise<ShopifyJournalProduct[]> {
  if (!STORE_DOMAIN || !ACCESS_TOKEN) {
    throw new Error("Missing SHOPIFY_STORE_DOMAIN or SHOPIFY_ADMIN_ACCESS_TOKEN env vars");
  }

  const res = await fetch(`https://${STORE_DOMAIN}/admin/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": ACCESS_TOKEN,
    },
    body: JSON.stringify({ query: PRODUCTS_QUERY, variables: { query } }),
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    throw new Error(`Shopify Admin API request failed: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  if (json.errors) {
    throw new Error(`Shopify Admin API error: ${JSON.stringify(json.errors)}`);
  }

  return json.data.products.nodes.map((p: RawProduct) => ({
    ...p,
    variants: p.variants.nodes,
    media: p.media.nodes
      .filter((m) => m.alt && m.image?.url)
      .map((m) => ({ alt: m.alt as string, url: m.image!.url })),
  }));
}

export async function fetchJournalProducts(): Promise<ShopifyJournalProduct[]> {
  return fetchProducts("tag:journal");
}

export async function fetchCharmProduct(): Promise<ShopifyJournalProduct | undefined> {
  const products = await fetchProducts("tag:charm");
  return products[0];
}

export async function fetchNotebookProduct(): Promise<ShopifyJournalProduct | undefined> {
  const products = await fetchProducts("tag:notebook");
  return products[0];
}

export async function fetchPatchProduct(): Promise<ShopifyJournalProduct | undefined> {
  const products = await fetchProducts("tag:patch");
  return products[0];
}

// ---------- Swatch colors ----------
// The single source of truth for String/Pen Holder swatch colors is the
// `sanaya`/`swatch_color` metafield the admin edits on each color's variant
// of the internal "Sanaya Component — String"/"— Pen Holder" tracker
// products (see Assets & Stock) — same namespace/key as
// `lib/admin/shopify-admin-data.ts`. Reading it here (instead of the old
// hardcoded `SWATCH_HEX` map in `catalog.ts`) means an admin edit shows up
// on this customer-facing picker without a code change/deploy.
const SWATCH_METAFIELD_NAMESPACE = "sanaya";
const SWATCH_METAFIELD_KEY = "swatch_color";

const SWATCH_QUERY = `
  query SwatchColors($query: String!) {
    products(first: 5, query: $query) {
      nodes {
        tags
        variants(first: 20) {
          nodes {
            title
            swatchMetafield: metafield(namespace: "${SWATCH_METAFIELD_NAMESPACE}", key: "${SWATCH_METAFIELD_KEY}") {
              value
            }
          }
        }
      }
    }
  }
`;

export interface SwatchColors {
  string: Record<string, string>;
  penHolder: Record<string, string>;
}

export async function fetchSwatchColors(): Promise<SwatchColors> {
  if (!STORE_DOMAIN || !ACCESS_TOKEN) {
    throw new Error("Missing SHOPIFY_STORE_DOMAIN or SHOPIFY_ADMIN_ACCESS_TOKEN env vars");
  }

  const res = await fetch(`https://${STORE_DOMAIN}/admin/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": ACCESS_TOKEN,
    },
    body: JSON.stringify({ query: SWATCH_QUERY, variables: { query: "tag:string OR tag:pen-holder" } }),
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    throw new Error(`Shopify Admin API request failed: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  if (json.errors) {
    throw new Error(`Shopify Admin API error: ${JSON.stringify(json.errors)}`);
  }

  const result: SwatchColors = { string: {}, penHolder: {} };
  const nodes: { tags: string[]; variants: { nodes: { title: string; swatchMetafield: { value: string } | null }[] } }[] =
    json.data.products.nodes;

  for (const product of nodes) {
    const bucket = product.tags.includes("string")
      ? result.string
      : product.tags.includes("pen-holder")
        ? result.penHolder
        : null;
    if (!bucket) continue;
    for (const variant of product.variants.nodes) {
      if (variant.swatchMetafield?.value) bucket[variant.title] = variant.swatchMetafield.value;
    }
  }

  return result;
}
