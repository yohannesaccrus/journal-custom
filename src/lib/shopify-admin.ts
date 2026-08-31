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
  /** Front-photo URL override, stored as a variant metafield rather than product media -- used for combos (Corner Edge x Patch) whose real photo would push a cover past Shopify's 250-media-per-product cap. See `resolveFrontImage` in catalog.ts. */
  frontImageOverride: { value: string } | null;
  selectedOptions: { name: string; value: string }[];
  inventoryQuantity: number;
}

const FRONT_IMAGE_METAFIELD_NAMESPACE = "custom";
const FRONT_IMAGE_METAFIELD_KEY = "front_image_override";

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

// Journal products can now carry Cover×String×Pen Holder×Patch×Edge combos
// (well over the old 40-variant cap, and now over 250 for some covers) — 250
// is Shopify's per-page connection max, so a product with >250 variants needs
// a follow-up paginated fetch (see fetchRemainingVariants below).
const PRODUCTS_QUERY = `
  query Products($query: String!) {
    products(first: 20, query: $query) {
      nodes {
        id
        handle
        title
        tags
        variants(first: 250) {
          pageInfo { hasNextPage endCursor }
          nodes {
            id
            title
            price
            sku
            image { url }
            frontImageOverride: metafield(namespace: "${FRONT_IMAGE_METAFIELD_NAMESPACE}", key: "${FRONT_IMAGE_METAFIELD_KEY}") { value }
            selectedOptions { name value }
            inventoryQuantity
          }
        }
        media(first: 250) {
          pageInfo { hasNextPage endCursor }
          nodes {
            alt
            ... on MediaImage { image { url } }
          }
        }
      }
    }
  }
`;

const REMAINING_VARIANTS_QUERY = `
  query RemainingVariants($id: ID!, $cursor: String!) {
    node(id: $id) {
      ... on Product {
        variants(first: 250, after: $cursor) {
          pageInfo { hasNextPage endCursor }
          nodes {
            id
            title
            price
            sku
            image { url }
            frontImageOverride: metafield(namespace: "${FRONT_IMAGE_METAFIELD_NAMESPACE}", key: "${FRONT_IMAGE_METAFIELD_KEY}") { value }
            selectedOptions { name value }
            inventoryQuantity
          }
        }
      }
    }
  }
`;

// Journal covers with 300+ variants (Corner Edge x Patch combos, see
// resolveFrontImage) also carry more than 250 media items once the front,
// back, and side view images pile up -- `media(first: 250)` alone silently
// drops anything past the first page, which is exactly how newly-added
// back/side images (added last, so sorted last) went missing from
// resolveSideImage even though they existed on Shopify. Needs the same
// follow-up pagination as variants.
const REMAINING_MEDIA_QUERY = `
  query RemainingMedia($id: ID!, $cursor: String!) {
    node(id: $id) {
      ... on Product {
        media(first: 250, after: $cursor) {
          pageInfo { hasNextPage endCursor }
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
  variants: { nodes: ShopifyVariant[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } };
  media: { nodes: { alt: string | null; image?: { url: string } }[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Fetching a full journal cover now takes several paginated requests (300+
// variants), so a THROTTLED response from Shopify's rate limiter is routine
// under normal traffic, not exceptional -- retry with backoff instead of
// failing the whole page load on it.
async function shopifyAdminRequest<T>(query: string, variables: Record<string, unknown>, retries = 8): Promise<T> {
  if (!STORE_DOMAIN || !ACCESS_TOKEN) {
    throw new Error("Missing SHOPIFY_STORE_DOMAIN or SHOPIFY_ADMIN_ACCESS_TOKEN env vars");
  }
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(`https://${STORE_DOMAIN}/admin/api/${API_VERSION}/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": ACCESS_TOKEN,
      },
      body: JSON.stringify({ query, variables }),
      // Journal covers routinely return several MB of variant data (300+
      // variants x image/frontImageOverride/selectedOptions), well past
      // Next's ~2MB per-item fetch-cache ceiling -- `next.revalidate` here
      // silently fails to cache every single response (see the "Failed to
      // set fetch cache ... items over 2MB" warning), which means it was
      // never actually caching and every page load re-fetched from scratch.
      // `fetchProducts` below does the real caching instead; opt this fetch
      // out entirely so it stops trying (and failing) to cache it too.
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`Shopify Admin API request failed: ${res.status} ${res.statusText}`);
    }
    const json = await res.json();
    if (json.errors) {
      if (JSON.stringify(json.errors).includes("THROTTLED") && attempt < retries) {
        await sleep(1000 * (attempt + 1));
        continue;
      }
      throw new Error(`Shopify Admin API error: ${JSON.stringify(json.errors)}`);
    }
    return json.data;
  }
  throw new Error("Shopify Admin API: exhausted retries");
}

interface RemainingVariantsResponse {
  node: { variants: { nodes: ShopifyVariant[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } } };
}

async function fetchRemainingVariants(productId: string, cursor: string): Promise<ShopifyVariant[]> {
  let variants: ShopifyVariant[] = [];
  let nextCursor: string | null = cursor;
  while (nextCursor) {
    const data: RemainingVariantsResponse = await shopifyAdminRequest<RemainingVariantsResponse>(REMAINING_VARIANTS_QUERY, {
      id: productId,
      cursor: nextCursor,
    });
    variants = variants.concat(data.node.variants.nodes);
    nextCursor = data.node.variants.pageInfo.hasNextPage ? data.node.variants.pageInfo.endCursor : null;
  }
  return variants;
}

interface RemainingMediaResponse {
  node: { media: { nodes: { alt: string | null; image?: { url: string } }[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } } };
}

async function fetchRemainingMedia(productId: string, cursor: string): Promise<{ alt: string | null; image?: { url: string } }[]> {
  let media: { alt: string | null; image?: { url: string } }[] = [];
  let nextCursor: string | null = cursor;
  while (nextCursor) {
    const data: RemainingMediaResponse = await shopifyAdminRequest<RemainingMediaResponse>(REMAINING_MEDIA_QUERY, {
      id: productId,
      cursor: nextCursor,
    });
    media = media.concat(data.node.media.nodes);
    nextCursor = data.node.media.pageInfo.hasNextPage ? data.node.media.pageInfo.endCursor : null;
  }
  return media;
}

async function fetchProductsUncached(query: string): Promise<ShopifyJournalProduct[]> {
  const data = await shopifyAdminRequest<{ products: { nodes: RawProduct[] } }>(PRODUCTS_QUERY, { query });

  // Sequential, not Promise.all — up to 13 journal covers each needing a
  // follow-up paginated fetch would otherwise fire that many requests at
  // once, which reliably trips Shopify's rate limiter as a burst even though
  // each individual request would fit comfortably within it.
  const products: ShopifyJournalProduct[] = [];
  for (const p of data.products.nodes) {
    let variants = p.variants.nodes;
    if (p.variants.pageInfo.hasNextPage && p.variants.pageInfo.endCursor) {
      // Small gap between covers' follow-up fetches -- firing all ~13 back
      // to back with zero spacing reliably bursts past Shopify's rate
      // limiter even though each individual request is well within budget.
      if (products.length > 0) await sleep(150);
      variants = variants.concat(await fetchRemainingVariants(p.id, p.variants.pageInfo.endCursor));
    }
    let mediaNodes = p.media.nodes;
    if (p.media.pageInfo.hasNextPage && p.media.pageInfo.endCursor) {
      await sleep(150);
      mediaNodes = mediaNodes.concat(await fetchRemainingMedia(p.id, p.media.pageInfo.endCursor));
    }
    products.push({
      ...p,
      variants,
      media: mediaNodes.filter((m) => m.alt && m.image?.url).map((m) => ({ alt: m.alt as string, url: m.image!.url })),
    });
  }

  return products;
}

const PRODUCTS_CACHE_TTL_MS = 5 * 60 * 1000;
// Keyed by the "tag:..." query string. Holds either a resolved value (with
// the time it was fetched) or an in-flight promise, so concurrent callers
// for the same query share one Shopify round trip instead of each starting
// their own -- same intent as the old React `cache()` wrapper, but this one
// survives across requests/reloads instead of resetting every render.
const productsCache = new Map<string, { promise: Promise<ShopifyJournalProduct[]>; fetchedAt: number }>();

// Journal covers are now expensive to fetch (paginated, ~150-450 Shopify API
// cost points per cover, several MB of response -- too large for Next's
// fetch cache, see the `cache: "no-store"` note in `shopifyAdminRequest`)
// and every one of the 5+ route/component call sites asks for the same
// "tag:journal" set. Without a real cross-request cache, every single page
// load re-fetches all 13 covers from scratch, which is what was keeping
// Shopify's rate limiter permanently tripped.
function fetchProducts(query: string): Promise<ShopifyJournalProduct[]> {
  const cached = productsCache.get(query);
  if (cached && Date.now() - cached.fetchedAt < PRODUCTS_CACHE_TTL_MS) {
    return cached.promise;
  }
  const promise = fetchProductsUncached(query).catch((err) => {
    // Don't leave a rejected promise cached -- the next call should retry
    // against Shopify instead of replaying the same failure for the TTL.
    productsCache.delete(query);
    throw err;
  });
  productsCache.set(query, { promise, fetchedAt: Date.now() });
  return promise;
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

/** "[JC] Sanaya Patch" — a tracker product whose 6 variants (Brown/Red/Sparkle × Heart/Star) exist purely so the picker has a photo thumbnail per patch; the patch itself is baked into each journal cover's own front photo (see `stringValueFor` in catalog.ts), not drawn from this product. */
export async function fetchPatchProduct(): Promise<ShopifyJournalProduct | undefined> {
  const products = await fetchProducts("tag:patch");
  return products[0];
}

/** "[JC] Sanaya Pouch" — a single-variant add-on product (like Charms), added as its own cart line item when the customer opts in on the Accessories step. Doesn't affect the cover photo, so it isn't baked into the journal variant matrix like Pen Holder/Corner Edge. */
export async function fetchPouchProduct(): Promise<ShopifyJournalProduct | undefined> {
  const products = await fetchProducts("tag:pouch");
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
