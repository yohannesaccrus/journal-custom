import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { randomBytes } from "crypto";
import { buildAuthorizeUrl, isShopifySignInConfigured } from "@/lib/shopify-oauth";

const STATE_COOKIE = "sanaya_admin_oauth_state";
const NEXT_COOKIE = "sanaya_admin_oauth_next";

export async function GET(request: NextRequest) {
  if (!isShopifySignInConfigured()) {
    return NextResponse.json({ error: "Shopify sign-in is not configured" }, { status: 501 });
  }

  const next = request.nextUrl.searchParams.get("next") ?? "/admin";
  const state = randomBytes(16).toString("hex");
  const redirectUri = new URL("/api/admin/auth/shopify/callback", request.url).toString();

  const response = NextResponse.redirect(buildAuthorizeUrl(redirectUri, state));
  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 10, // 10 minutes — just long enough to complete the OAuth round trip
  };
  response.cookies.set(STATE_COOKIE, state, cookieOpts);
  response.cookies.set(NEXT_COOKIE, next, cookieOpts);
  return response;
}
