import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { attachImageUrlToVariant } from "@/lib/admin/shopify-admin-data";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { productId, variantId, sourceUrl } = body as {
    productId?: string;
    variantId?: string;
    sourceUrl?: string;
  };

  if (!productId || !variantId || !sourceUrl) {
    return NextResponse.json({ error: "Missing productId, variantId, or sourceUrl" }, { status: 400 });
  }

  try {
    const url = await attachImageUrlToVariant(productId, variantId, sourceUrl);
    return NextResponse.json({ ok: true, url });
  } catch (err) {
    return NextResponse.json({ error: String(err instanceof Error ? err.message : err) }, { status: 500 });
  }
}
