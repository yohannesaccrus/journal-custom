import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { addAsset, deleteAsset, updateAsset, type AssetInput } from "@/lib/admin/cz-catalog-store";
import { CZ_KIND_ORDER, type CzKind } from "@/lib/admin/cz-catalog";
import { clearCzAssetStock } from "@/lib/admin/cz-ledger";
import { syncStorefrontStock } from "@/lib/admin/cz-storefront-stock";

/**
 * Assets added from the admin (a new cover, charm, patch or string). Saving also publishes them to
 * the storefront catalogue (sanaya.cz_catalog_public), which the theme appends to its own.
 *   POST   { kind, id, label, group?, hex?, ci?, positionedLike?, image?, spine? }  adds one
 *   PATCH  { key, ...same }                                                         edits one
 *   DELETE { key }                                   deletes one, its images and its stock count
 */
const err = (e: unknown) => NextResponse.json({ error: String(e instanceof Error ? e.message : e) }, { status: 400 });

export async function POST(request: NextRequest) {
  const input = (await request.json()) as AssetInput;
  if (!input.kind || !CZ_KIND_ORDER.includes(input.kind as CzKind) || !input.id || !input.label) {
    return NextResponse.json({ error: "kind, id and label are required" }, { status: 400 });
  }
  try {
    return NextResponse.json({ ok: true, asset: await addAsset(input) });
  } catch (e) {
    return err(e);
  }
}

export async function PATCH(request: NextRequest) {
  const { key, ...input } = (await request.json()) as AssetInput & { key?: string };
  if (!key) return NextResponse.json({ error: "key is required" }, { status: 400 });
  try {
    return NextResponse.json({ ok: true, asset: await updateAsset(key, input as AssetInput) });
  } catch (e) {
    return err(e);
  }
}

export async function DELETE(request: NextRequest) {
  const { key } = (await request.json()) as { key?: string };
  if (!key) return NextResponse.json({ error: "key is required" }, { status: 400 });
  try {
    await deleteAsset(key);
    await clearCzAssetStock(key);
    await syncStorefrontStock();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return err(e);
  }
}
