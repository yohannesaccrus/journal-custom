import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { setVariantStock, syncJournalStock, type JournalStockResult } from "@/lib/admin/shopify-admin-data";

/** Tags whose stock feeds the shared raw-material pool (see `syncJournalStock`) — editing any of these should cascade to every real journal combo, not just the tracker row itself. */
const STOCK_COMPONENT_TAGS = ["cover", "string", "pen-holder", "edge", "patch"];

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { inventoryItemId, quantity, productTags } = body as {
    inventoryItemId?: string;
    quantity?: number;
    productTags?: string[];
  };

  if (!inventoryItemId || typeof quantity !== "number" || quantity < 0) {
    return NextResponse.json({ error: "Invalid inventoryItemId or quantity" }, { status: 400 });
  }

  try {
    await setVariantStock(inventoryItemId, quantity);
    let journalStockSync: JournalStockResult[] = [];
    if (productTags?.some((t) => STOCK_COMPONENT_TAGS.includes(t))) {
      journalStockSync = await syncJournalStock();
    }
    return NextResponse.json({ ok: true, journalStockSync });
  } catch (err) {
    return NextResponse.json({ error: String(err instanceof Error ? err.message : err) }, { status: 500 });
  }
}
