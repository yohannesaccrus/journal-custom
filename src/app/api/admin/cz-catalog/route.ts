import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { addAsset } from "@/lib/admin/cz-catalog-store";
import { CZ_KIND_ORDER, type CzKind } from "@/lib/admin/cz-catalog";

/**
 * Adds a new customizer asset (a new cover, charm design, etc.) to OUR catalogue mirror, so its
 * stock can be tracked right away. Does not touch the theme -- the storefront only offers it once
 * whoever maintains sections/sanaya-cz-catalog.liquid adds the same id there.
 */
export async function POST(request: NextRequest) {
  const { kind, id, label, group } = (await request.json()) as { kind?: string; id?: string; label?: string; group?: string };
  if (!kind || !CZ_KIND_ORDER.includes(kind as CzKind) || !id || !label) {
    return NextResponse.json({ error: "kind, id and label are required" }, { status: 400 });
  }
  try {
    const asset = await addAsset({ kind: kind as CzKind, id, label, group });
    return NextResponse.json({ ok: true, asset });
  } catch (err) {
    return NextResponse.json({ error: String(err instanceof Error ? err.message : err) }, { status: 400 });
  }
}
