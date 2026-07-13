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
          }
        }
        media(first: 100) {
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
