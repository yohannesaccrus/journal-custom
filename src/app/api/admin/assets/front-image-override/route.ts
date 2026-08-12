import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { setVariantFrontImageOverride, uploadFrontImageOverride } from "@/lib/admin/shopify-admin-data";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const variantId = String(form.get("variantId") ?? "");
  const file = form.get("file");

  if (!variantId || !(file instanceof File)) {
    return NextResponse.json({ error: "Missing variantId or file" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "File must be an image" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await uploadFrontImageOverride(variantId, {
      filename: file.name || "front-image-override.jpg",
      mimeType: file.type,
      size: buffer.byteLength,
      data: buffer,
    });
    return NextResponse.json({ ok: true, url });
  } catch (err) {
    return NextResponse.json({ error: String(err instanceof Error ? err.message : err) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const body = await request.json();
  const { variantId } = body as { variantId?: string };

  if (!variantId) {
    return NextResponse.json({ error: "Missing variantId" }, { status: 400 });
  }

  try {
    await setVariantFrontImageOverride(variantId, null);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err instanceof Error ? err.message : err) }, { status: 500 });
  }
}
