import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { setVariantStock } from "@/lib/admin/shopify-admin-data";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { inventoryItemId, quantity } = body as { inventoryItemId?: string; quantity?: number };

  if (!inventoryItemId || typeof quantity !== "number" || quantity < 0) {
    return NextResponse.json({ error: "Invalid inventoryItemId or quantity" }, { status: 400 });
  }

  try {
    await setVariantStock(inventoryItemId, quantity);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err instanceof Error ? err.message : err) }, { status: 500 });
  }
}
