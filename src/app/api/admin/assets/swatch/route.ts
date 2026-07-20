import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { setVariantSwatchColor } from "@/lib/admin/shopify-admin-data";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { variantId, hex } = body as { variantId?: string; hex?: string | null };

  if (!variantId) {
    return NextResponse.json({ error: "Missing variantId" }, { status: 400 });
  }
  if (hex && !/^#[0-9a-fA-F]{6}$/.test(hex)) {
    return NextResponse.json({ error: "hex must look like #rrggbb" }, { status: 400 });
  }

  try {
    await setVariantSwatchColor(variantId, hex ?? null);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err instanceof Error ? err.message : err) }, { status: 500 });
  }
}
