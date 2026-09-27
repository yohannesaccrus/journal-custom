import "server-only";
import { shopifyAdmin } from "@/lib/admin/shopify-admin-data";
import { CZ_ASSETS, type CzAsset, type CzKind } from "@/lib/admin/cz-catalog";

/**
 * Assets added from this dashboard after go-live (a new cover, a new charm design...), kept in our
 * own shop metafield `sanaya.cz_catalog_extra` -- the theme's own catalogue (snippets/sanaya-cz-catalog.liquid)
 * is never written to from here. Merged with the static CZ_ASSETS list at read time, so the rest of
 * the admin (stock, usage) sees one combined list. Adding an asset HERE does not make the storefront
 * offer it -- that still needs the theme's catalogue snippet updated with the same id, by whoever
 * maintains that theme. This just gets the id/label/image agreed and stock tracked ahead of that.
 */
const NAMESPACE = "sanaya";
const KEY = "cz_catalog_extra";

export async function readExtraAssets(): Promise<CzAsset[]> {
  const data = await shopifyAdmin<{ shop: { metafield: { value: string } | null } }>(
    `query { shop { metafield(namespace: "${NAMESPACE}", key: "${KEY}") { value } } }`
  );
  const raw = data.shop.metafield?.value;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CzAsset[]) : [];
  } catch {
    return [];
  }
}

async function writeExtraAssets(assets: CzAsset[]): Promise<void> {
  const shop = await shopifyAdmin<{ shop: { id: string } }>(`query { shop { id } }`);
  const result = await shopifyAdmin<{ metafieldsSet: { userErrors: { message: string }[] } }>(
    `mutation($m: [MetafieldsSetInput!]!) { metafieldsSet(metafields: $m) { userErrors { message } } }`,
    { m: [{ ownerId: shop.shop.id, namespace: NAMESPACE, key: KEY, type: "json", value: JSON.stringify(assets) }] }
  );
  if (result.metafieldsSet.userErrors.length) {
    throw new Error(`Failed to save the new asset: ${JSON.stringify(result.metafieldsSet.userErrors)}`);
  }
}

/** The static list plus whatever has been added from this dashboard. */
export async function readAllAssets(): Promise<CzAsset[]> {
  return [...CZ_ASSETS, ...(await readExtraAssets())];
}

export interface NewAssetInput {
  kind: CzKind;
  id: string;
  label: string;
  /** Free-text match value for tying order line-item properties back to this asset (defaults to `label`). */
  match?: string;
  group?: string;
}

const SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/;

export async function addAsset(input: NewAssetInput): Promise<CzAsset> {
  const id = input.id.trim().toLowerCase();
  const label = input.label.trim();
  if (!SLUG.test(id)) throw new Error("Id must be lowercase letters, numbers and hyphens only (e.g. \"an-purple\")");
  if (!label) throw new Error("Label is required");
  const all = await readAllAssets();
  const key = `${input.kind}:${id}`;
  if (all.some((a) => a.key === key)) throw new Error(`"${id}" already exists under ${input.kind}`);
  const asset: CzAsset = { key, kind: input.kind, id, label, match: input.match?.trim() || label, group: input.group?.trim() || undefined };
  const extra = await readExtraAssets();
  extra.push(asset);
  await writeExtraAssets(extra);
  return asset;
}
