import "server-only";
import { shopifyAdmin } from "@/lib/admin/shopify-admin-data";

/**
 * Images for assets added from the admin live in the store's Shopify Files (Content > Files), so
 * the storefront loads them from Shopify's CDN (which resizes with ?width=, like theme assets) and
 * they survive theme changes. Two steps, so a large photo never passes through our server (Vercel
 * caps request bodies at a few MB): the browser uploads straight to a staged target, then we turn
 * that upload into a file.
 */

interface UserErrors {
  userErrors: { field: string[] | null; message: string }[];
}
const check = (what: string, p: UserErrors) => {
  if (p.userErrors.length) throw new Error(`${what}: ${p.userErrors.map((e) => e.message).join("; ")}`);
};

const MAX_BYTES = 20 * 1024 * 1024;
const MIME = /^image\/(png|jpe?g|webp|gif)$/;

export interface StagedTarget {
  url: string;
  resourceUrl: string;
  parameters: { name: string; value: string }[];
}

/** Step 1: a one-off target the browser uploads the image to. */
export async function stageImageUpload(filename: string, mimeType: string, size: number): Promise<StagedTarget> {
  if (!MIME.test(mimeType)) throw new Error("Use a PNG, JPG, WebP or GIF image");
  if (!(size > 0) || size > MAX_BYTES) throw new Error("Images must be under 20 MB");
  const data = await shopifyAdmin<{ stagedUploadsCreate: UserErrors & { stagedTargets: StagedTarget[] } }>(
    `mutation CzStagedUpload($input: [StagedUploadInput!]!) {
      stagedUploadsCreate(input: $input) { stagedTargets { url resourceUrl parameters { name value } } userErrors { field message } }
    }`,
    { input: [{ resource: "IMAGE", filename, mimeType, httpMethod: "POST", fileSize: String(size) }] }
  );
  check("Couldn't prepare the upload", data.stagedUploadsCreate);
  return data.stagedUploadsCreate.stagedTargets[0];
}

export interface CzImage {
  fileId: string;
  url: string;
  width: number;
  height: number;
}

/** Step 2: turns the staged upload into a file in Shopify Files and waits until it has a CDN URL. */
export async function createImageFile(resourceUrl: string, filename: string, alt: string): Promise<CzImage> {
  if (!/^https:\/\/[^/]*(shopify|googleapis)\.com\//.test(resourceUrl)) throw new Error("Not a Shopify upload");
  const created = await shopifyAdmin<{ fileCreate: UserErrors & { files: { id: string; fileStatus: string }[] } }>(
    `mutation CzFileCreate($files: [FileCreateInput!]!) {
      fileCreate(files: $files) { files { id fileStatus } userErrors { field message } }
    }`,
    { files: [{ originalSource: resourceUrl, contentType: "IMAGE", filename, alt }] }
  );
  check("Couldn't save the image", created.fileCreate);
  const fileId = created.fileCreate.files[0].id;

  // Shopify processes images asynchronously; usually a second or two.
  for (let i = 0; i < 20; i++) {
    const s = await shopifyAdmin<{ node: { fileStatus: string; image: { url: string; width: number; height: number } | null } | null }>(
      `query CzFileStatus($id: ID!) { node(id: $id) { ... on MediaImage { fileStatus image { url width height } } } }`,
      { id: fileId }
    );
    const n = s.node;
    if (n?.fileStatus === "FAILED") throw new Error("Shopify couldn't process that image");
    if (n?.fileStatus === "READY" && n.image) return { fileId, url: n.image.url, width: n.image.width, height: n.image.height };
    await new Promise((r) => setTimeout(r, 750));
  }
  throw new Error("The image is still processing in Shopify; try again in a moment");
}

/** Removes images that belonged to a deleted asset. Missing files are ignored. */
export async function deleteFiles(fileIds: string[]): Promise<void> {
  if (!fileIds.length) return;
  const res = await shopifyAdmin<{ fileDelete: UserErrors & { deletedFileIds: string[] | null } }>(
    `mutation CzFileDelete($fileIds: [ID!]!) {
      fileDelete(fileIds: $fileIds) { deletedFileIds userErrors { field message } }
    }`,
    { fileIds }
  );
  const errors = res.fileDelete.userErrors.filter((e) => !/not found|does not exist/i.test(e.message));
  if (errors.length) throw new Error(`Couldn't delete the old image: ${errors.map((e) => e.message).join("; ")}`);
}
