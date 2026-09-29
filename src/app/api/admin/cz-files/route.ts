import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createImageFile, deleteFiles, stageImageUpload } from "@/lib/admin/cz-files";

/**
 * Image uploads for assets added from the admin, in two calls so the photo itself goes straight
 * from the browser to Shopify: `{ action: "stage", filename, mimeType, size }` returns where to
 * upload it, then `{ action: "create", resourceUrl, filename, alt }` turns it into a file in
 * Shopify Files and returns its CDN URL and size. `{ action: "discard", fileIds }` deletes uploads
 * that were never saved to an asset (the form was cancelled or the photo replaced before saving).
 */
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    action?: "stage" | "create" | "discard";
    fileIds?: string[];
    filename?: string;
    mimeType?: string;
    size?: number;
    resourceUrl?: string;
    alt?: string;
  };
  try {
    if (body.action === "stage" && body.filename && body.mimeType && typeof body.size === "number") {
      return NextResponse.json(await stageImageUpload(body.filename, body.mimeType, body.size));
    }
    if (body.action === "create" && body.resourceUrl && body.filename) {
      return NextResponse.json(await createImageFile(body.resourceUrl, body.filename, body.alt ?? ""));
    }
    if (body.action === "discard" && Array.isArray(body.fileIds)) {
      const ids = body.fileIds.filter((id) => typeof id === "string" && id.startsWith("gid://shopify/MediaImage/"));
      await deleteFiles(ids);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Unknown request" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: String(err instanceof Error ? err.message : err) }, { status: 400 });
  }
}
