import { NextResponse } from "next/server";
import { migratePatchOptionOntoExistingCovers, syncJournalPricing } from "@/lib/admin/shopify-admin-data";

/** One-click migration button (Patch tracker card) for covers created before Patch became a real 4th option — see `migratePatchOptionOntoExistingCovers`. Safe to call repeatedly; already-migrated covers are skipped. */
export async function POST() {
  try {
    const results = await migratePatchOptionOntoExistingCovers();
    await syncJournalPricing();
    return NextResponse.json({ ok: true, results });
  } catch (err) {
    return NextResponse.json({ error: String(err instanceof Error ? err.message : err) }, { status: 500 });
  }
}
