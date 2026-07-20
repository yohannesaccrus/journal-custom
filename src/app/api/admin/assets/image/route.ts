import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { uploadVariantImage } from "@/lib/admin/shopify-admin-data";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const productId = String(form.get("productId") ?? "");
  const variantId = String(form.get("variantId") ?? "");
  const file = form.get("file");

  if (!productId || !variantId || !(file instanceof File)) {
    return NextResponse.json({ error: "Missing productId, variantId, or file" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "File must be an image" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await uploadVariantImage(productId, variantId, {
      filename: file.name || "variant-image.jpg",
      mimeType: file.type,
      size: buffer.byteLength,
      data: buffer,
    });
    return NextResponse.json({ ok: true, url });
  } catch (err) {
    return NextResponse.json({ error: String(err instanceof Error ? err.message : err) }, { status: 500 });
  }
}
