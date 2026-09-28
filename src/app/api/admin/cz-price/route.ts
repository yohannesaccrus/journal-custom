import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { setCzPriceIdr, setupIdrPriceList } from "@/lib/admin/cz-price";
import type { CzPriceKey } from "@/lib/admin/cz-stock";

/**
 * Customizer product prices. `{ key, idr }` sets that product's price for Indonesia and moves every
 * other market by the same ratio (see cz-price.ts). `{ action: "setup" }` creates the Indonesia IDR
 * price list those prices go into, once.
 */
export async function POST(request: NextRequest) {
  const body = (await request.json()) as { action?: "setup"; key?: CzPriceKey; idr?: number };
  try {
    if (body.action === "setup") {
      await setupIdrPriceList();
    } else {
      if (!body.key || typeof body.idr !== "number") {
        return NextResponse.json({ error: "key and idr are required" }, { status: 400 });
      }
      await setCzPriceIdr(body.key, body.idr);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err instanceof Error ? err.message : err) }, { status: 400 });
  }
}
