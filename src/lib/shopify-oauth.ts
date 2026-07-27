import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

/** Minimal scope — this flow is only used to prove the visitor is staff/owner
 * of the store (they must be logged into its Shopify admin to authorize),
 * not to obtain a token we actually use afterwards. */
const AUTH_SCOPE = "read_products";

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} env var`);
  return v;
}

export function isShopifySignInConfigured(): boolean {
  return Boolean(process.env.SHOPIFY_APP_CLIENT_ID && process.env.SHOPIFY_APP_CLIENT_SECRET);
}

export function buildAuthorizeUrl(redirectUri: string, state: string): string {
  const shop = env("SHOPIFY_STORE_DOMAIN");
  const clientId = env("SHOPIFY_APP_CLIENT_ID");
  const params = new URLSearchParams({
    client_id: clientId,
    scope: AUTH_SCOPE,
    redirect_uri: redirectUri,
    state,
  });
  return `https://${shop}/admin/oauth/authorize?${params.toString()}`;
}

/** Verifies Shopify's callback query string is authentic (signed with our
 * app's client secret) and for the expected shop — not just any `code`
 * someone throws at the callback URL. */
export function verifyCallbackHmac(searchParams: URLSearchParams): boolean {
  const clientSecret = env("SHOPIFY_APP_CLIENT_SECRET");
  const provided = searchParams.get("hmac");
  if (!provided) return false;

  const pairs: string[] = [];
  for (const [key, value] of searchParams.entries()) {
    if (key === "hmac" || key === "signature") continue;
    pairs.push(`${key}=${value}`);
  }
  pairs.sort();
  const message = pairs.join("&");
  const computed = createHmac("sha256", clientSecret).update(message).digest("hex");

  const a = Buffer.from(provided);
  const b = Buffer.from(computed);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function exchangeCodeForToken(code: string): Promise<void> {
  const shop = env("SHOPIFY_STORE_DOMAIN");
  const clientId = env("SHOPIFY_APP_CLIENT_ID");
  const clientSecret = env("SHOPIFY_APP_CLIENT_SECRET");

  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
  });
  if (!res.ok) {
    throw new Error(`Shopify token exchange failed: ${res.status} ${await res.text()}`);
  }
  // The token itself is discarded — a successful exchange is proof enough
  // that the visitor authorized as staff/owner of the store; the app's
  // existing SHOPIFY_ADMIN_ACCESS_TOKEN is what's actually used for API
  // calls, not a per-visitor token.
}
