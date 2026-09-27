import { LEGACY_ADMIN_ENABLED } from "@/lib/admin/feature-flags";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateProductTitle } from "@/lib/admin/shopify-admin-data";

export async function PATCH(request: NextRequest) {
  if (!LEGACY_ADMIN_ENABLED) return Response.json({ error: "Disabled" }, { status: 404 });
  const body = await request.json();
  const { productId, title } = body as { productId?: string; title?: string };

  if (!productId || !title?.trim()) {
    return NextResponse.json({ error: "Missing productId or title" }, { status: 400 });
  }

  try {
    await updateProductTitle(productId, title.trim());
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err instanceof Error ? err.message : err) }, { status: 500 });
  }
}
