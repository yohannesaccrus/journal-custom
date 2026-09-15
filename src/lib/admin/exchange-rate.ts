import "server-only";

/**
 * Single source of truth for the EUR->IDR rate, shared between this admin
 * panel and the storefront theme via a Shopify shop metafield
 * (`sanaya.eur_idr_rate`). The theme's jc-product-page.liquid section reads
 * the exact same metafield to force IDR pricing for /id visitors — editing
 * the rate here is what keeps admin display prices and what /id shoppers are
 * actually charged from drifting apart.
 */
const NAMESPACE = "sanaya";
const KEY = "eur_idr_rate";

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

/** Reads the current EUR->IDR rate, or null if the metafield hasn't been set yet. */
export async function getEurIdrRate(): Promise<number | null> {
  const data = await shopifyAdmin<{ shop: { metafield: { value: string } | null } }>(
    `query { shop { metafield(namespace: "${NAMESPACE}", key: "${KEY}") { value } } }`
  );
  const raw = data.shop.metafield?.value;
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Writes the rate, creating the metafield definition (with storefront read
 * access so the theme's Liquid can see it via `shop.metafields.sanaya.eur_idr_rate`)
 * on first use if it doesn't exist yet.
 */
export async function setEurIdrRate(rate: number): Promise<void> {
  const shopData = await shopifyAdmin<{ shop: { id: string } }>(`query { shop { id } }`);

  await shopifyAdmin(
    `mutation EnsureRateDefinition {
      metafieldDefinitionCreate(definition: {
        name: "EUR to IDR rate"
        namespace: "${NAMESPACE}"
        key: "${KEY}"
        type: "number_decimal"
        ownerType: SHOP
        access: { storefront: PUBLIC_READ }
      }) {
        createdDefinition { id }
        userErrors { field message code }
      }
    }`
  ).catch(() => {
    // Ignore "already exists" and similar — the definition only needs to be
    // created once; a failure here shouldn't block writing the value.
  });

  const result = await shopifyAdmin<{
    metafieldsSet: { userErrors: { field: string[]; message: string }[] };
  }>(
    `mutation SetRate($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        userErrors { field message }
      }
    }`,
    {
      metafields: [
        {
          ownerId: shopData.shop.id,
          namespace: NAMESPACE,
          key: KEY,
          type: "number_decimal",
          value: String(rate),
        },
      ],
    }
  );

  if (result.metafieldsSet.userErrors.length > 0) {
    throw new Error(`Failed to set exchange rate: ${JSON.stringify(result.metafieldsSet.userErrors)}`);
  }
}
