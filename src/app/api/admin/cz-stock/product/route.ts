import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { adjustCzProductStock, setCzProductStock } from "@/lib/admin/cz-stock";

/**
 * Shopify inventory of one variant of a customizer add-on product (Charm S/M/L, Pen holder, ...).
 * mode "set": exact count (switches tracking on if needed). "add" / "remove": change by `quantity`.
 */
export async function POST(request: NextRequest) {
  const { inventoryItemId, quantity, mode } = (await request.json()) as { inventoryItemId?: string; quantity?: number; mode?: "set" | "add" | "remove" };
  if (!inventoryItemId || typeof quantity !== "number" || !["set", "add", "remove"].includes(mode ?? "")) {
    return NextResponse.json({ error: "inventoryItemId, quantity and mode (set|add|remove) are required" }, { status: 400 });
  }
  try {
    if (mode === "set") await setCzProductStock(inventoryItemId, quantity);
    else await adjustCzProductStock(inventoryItemId, mode === "add" ? quantity : -quantity);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err instanceof Error ? err.message : err) }, { status: 400 });
  }
}
