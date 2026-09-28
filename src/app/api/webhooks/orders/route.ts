import { createHmac, timingSafeEqual } from "node:crypto";
import { after, NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { syncStorefrontStock } from "@/lib/admin/cz-storefront-stock";

/**
 * Shopify webhooks orders/create and orders/cancelled (subscribed in shopify.app.sanaya.toml).
 * Any order may have used or given back customizer assets, so the storefront's stock is rebuilt
 * from scratch (see cz-storefront-stock.ts) rather than read from the payload. Shopify wants an
 * answer within 5 seconds, so the rebuild runs after the response.
 */
export const maxDuration = 60;

function verified(body: string, hmac: string | null): boolean {
  const secret = process.env.SHOPIFY_APP_CLIENT_SECRET;
  if (!secret || !hmac) return false;
  const expected = createHmac("sha256", secret).update(body, "utf8").digest();
  const given = Buffer.from(hmac, "base64");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  if (!verified(body, request.headers.get("x-shopify-hmac-sha256"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  if (request.headers.get("x-shopify-shop-domain") !== process.env.SHOPIFY_STORE_DOMAIN) {
    return NextResponse.json({ ok: true, ignored: "other shop" });
  }
  after(() =>
    syncStorefrontStock().catch((err: unknown) =>
      console.error(`Storefront stock sync after ${request.headers.get("x-shopify-topic")} failed:`, err)
    )
  );
  return NextResponse.json({ ok: true });
}
