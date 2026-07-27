import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE, createSessionCookieValue } from "@/lib/admin-auth";
import { exchangeCodeForToken, verifyCallbackHmac } from "@/lib/shopify-oauth";

const STATE_COOKIE = "sanaya_admin_oauth_state";
const NEXT_COOKIE = "sanaya_admin_oauth_next";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const shop = params.get("shop");
  const state = params.get("state");

  const expectedState = request.cookies.get(STATE_COOKIE)?.value;
  const next = request.cookies.get(NEXT_COOKIE)?.value || "/admin";

  const fail = (reason: string) => {
    const url = new URL("/admin/login", request.url);
    url.searchParams.set("error", "shopify");
    console.error(`Shopify admin sign-in failed: ${reason}`);
    return NextResponse.redirect(url, { status: 303 });
  };

  if (!code || !shop || !state) return fail("missing code/shop/state");
  if (!expectedState || state !== expectedState) return fail("state mismatch");
  if (shop !== process.env.SHOPIFY_STORE_DOMAIN) return fail("shop mismatch");
  if (!verifyCallbackHmac(params)) return fail("invalid hmac");

  try {
    await exchangeCodeForToken(code);
  } catch (err) {
    return fail(`token exchange error: ${err instanceof Error ? err.message : err}`);
  }

  const response = NextResponse.redirect(new URL(next, request.url), { status: 303 });
  response.cookies.set(ADMIN_SESSION_COOKIE, createSessionCookieValue(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12, // 12 hours, matching the password login flow
  });
  response.cookies.delete(STATE_COOKIE);
  response.cookies.delete(NEXT_COOKIE);
  return response;
}
