import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { adjustCzAssetStock, setCzAssetStock } from "@/lib/admin/cz-ledger";

/**
 * Stock of one customizer asset (cover, string, charm...), kept in our own shop metafield.
 * mode "set": recount to `quantity`. "add" / "remove": change what is left by `quantity`.
 */
export async function POST(request: NextRequest) {
  const { key, quantity, mode } = (await request.json()) as { key?: string; quantity?: number; mode?: "set" | "add" | "remove" };
  if (!key || typeof quantity !== "number" || !["set", "add", "remove"].includes(mode ?? "")) {
    return NextResponse.json({ error: "key, quantity and mode (set|add|remove) are required" }, { status: 400 });
  }
  try {
    if (mode === "set") await setCzAssetStock(key, quantity);
    else await adjustCzAssetStock(key, mode === "add" ? quantity : -quantity);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err instanceof Error ? err.message : err) }, { status: 400 });
  }
}
