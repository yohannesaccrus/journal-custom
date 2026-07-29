import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { setVariantStock, syncJournalVariantStock } from "@/lib/admin/shopify-admin-data";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { inventoryItemId, quantity, productTags, colorLabel } = body as {
    inventoryItemId?: string;
    quantity?: number;
    productTags?: string[];
    colorLabel?: string;
  };

  if (!inventoryItemId || typeof quantity !== "number" || quantity < 0) {
    return NextResponse.json({ error: "Invalid inventoryItemId or quantity" }, { status: 400 });
  }

  try {
    await setVariantStock(inventoryItemId, quantity);
    const journalSync =
      productTags && colorLabel ? await syncJournalVariantStock(productTags, colorLabel, quantity) : [];
    return NextResponse.json({ ok: true, journalSync });
  } catch (err) {
    return NextResponse.json({ error: String(err instanceof Error ? err.message : err) }, { status: 500 });
  }
}
