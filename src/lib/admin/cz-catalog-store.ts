import "server-only";
import { shopifyAdmin } from "@/lib/admin/shopify-admin-data";
import { CZ_ASSETS, type CzAsset, type CzCustomFields, type CzKind } from "@/lib/admin/cz-catalog";
import { CZ_COVER_GEOMETRY } from "@/lib/admin/cz-geometry";
import { deleteFiles, type CzImage } from "@/lib/admin/cz-files";

/**
 * Assets added from the admin (a new cover, charm, patch or string), kept in our shop metafield
 * `sanaya.cz_catalog_extra` and merged with the built-in CZ_ASSETS, so stock and usage treat them
 * like any other asset.
 *
 * The storefront sees them through `sanaya.cz_catalog_public`, which the theme's catalogue snippet
 * appends to its own lists, with a `files` map the customizer uses for their images (see
 * EXAMPLE_STOCK in the repo root). Notebooks, corners and pen holders added here are tracked in the
 * admin only: the customizer has no room for new ones.
 */
const NAMESPACE = "sanaya";
const KEY = "cz_catalog_extra";
const PUBLIC_KEY = "cz_catalog_public";

/** Kinds the storefront customizer can offer when added from the admin. */
export const CZ_STOREFRONT_KINDS: CzKind[] = ["cover", "string", "charm", "patch"];

async function shopId() {
  return (await shopifyAdmin<{ shop: { id: string } }>(`query { shop { id } }`)).shop.id;
}

async function setShopJson(key: string, value: unknown, what: string) {
  const result = await shopifyAdmin<{ metafieldsSet: { userErrors: { message: string }[] } }>(
    `mutation($m: [MetafieldsSetInput!]!) { metafieldsSet(metafields: $m) { userErrors { message } } }`,
    { m: [{ ownerId: await shopId(), namespace: NAMESPACE, key, type: "json", value: JSON.stringify(value) }] }
  );
  if (result.metafieldsSet.userErrors.length) throw new Error(`${what}: ${JSON.stringify(result.metafieldsSet.userErrors)}`);
}

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
  await setShopJson(KEY, assets, "Failed to save the asset");
  await publishStorefrontCatalog(assets);
}

/** The static list plus whatever has been added from this dashboard. */
export async function readAllAssets(): Promise<CzAsset[]> {
  return [...CZ_ASSETS, ...(await readExtraAssets())];
}

export interface AssetInput {
  kind: CzKind;
  id: string;
  label: string;
  /** Cover: "Classic leather" | "Animal print". Charm: "Size S" | "Size M" | "Size L". */
  group?: string;
  hex?: string;
  ci?: string;
  positionedLike?: string;
  image?: CzImage;
  spine?: CzImage;
}

const SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/;
const HEX = /^#[0-9a-f]{6}$/i;
const COVER_GROUPS = ["Classic leather", "Animal print"];
const CHARM_GROUPS = ["Size S", "Size M", "Size L"];

/** Checks what each kind needs for the customizer to show it; returns the cleaned-up asset. */
function build(input: AssetInput, existing?: CzAsset): CzAsset {
  const kind = input.kind;
  const id = input.id.trim().toLowerCase();
  const label = input.label.trim();
  if (kind === "charm") {
    if (!/^[1-9][0-9]{0,3}$/.test(id)) throw new Error("A charm's id is its number, e.g. 89");
  } else if (!SLUG.test(id)) {
    throw new Error('Id must be lowercase letters, numbers and hyphens only (e.g. "an-purple")');
  }
  if (!label) throw new Error("Label is required");
  const group = input.group?.trim() || undefined;
  const custom: CzCustomFields = { createdAt: existing?.custom?.createdAt ?? new Date().toISOString() };

  switch (kind) {
    case "cover":
      if (!group || !COVER_GROUPS.includes(group)) throw new Error("Choose Classic leather or Animal print");
      if (!input.image) throw new Error("Add the cover's front photo");
      if (!input.spine) throw new Error("Add the cover's spine photo");
      if (!input.positionedLike || !CZ_COVER_GEOMETRY[input.positionedLike]) throw new Error("Choose which cover it's positioned like");
      Object.assign(custom, { image: input.image, spine: input.spine, positionedLike: input.positionedLike, ci: input.ci?.trim() || label });
      break;
    case "charm":
      if (!group || !CHARM_GROUPS.includes(group)) throw new Error("Choose the charm's size");
      if (!input.image) throw new Error("Add the charm's photo");
      custom.image = input.image;
      break;
    case "patch":
      if (!input.image) throw new Error("Add the patch's photo");
      custom.image = input.image;
      break;
    case "string":
      if (!input.hex || !HEX.test(input.hex)) throw new Error("Pick the string's colour");
      Object.assign(custom, { hex: input.hex.toLowerCase(), image: input.image });
      break;
    default:
      if (input.image) custom.image = input.image;
  }
  return {
    key: `${kind}:${id}`,
    kind,
    id,
    label,
    // What the order line says, so usage is counted: covers, strings and patches by label, charms by number.
    match: kind === "charm" ? id : label,
    group,
    custom,
  };
}

export async function addAsset(input: AssetInput): Promise<CzAsset> {
  const asset = build(input);
  const all = await readAllAssets();
  if (all.some((a) => a.key === asset.key)) throw new Error(`"${asset.id}" already exists under ${asset.kind}`);
  if (all.some((a) => a.kind === asset.kind && a.match === asset.match)) throw new Error(`Another ${asset.kind} is already called "${asset.label}"`);
  const extra = await readExtraAssets();
  extra.push(asset);
  await writeExtraAssets(extra);
  return asset;
}

/** Edits an asset added from the admin. Its kind and id stay; replaced images are deleted from Shopify Files. */
export async function updateAsset(key: string, input: AssetInput): Promise<CzAsset> {
  const extra = await readExtraAssets();
  const i = extra.findIndex((a) => a.key === key);
  if (i < 0) throw new Error("Only assets added from the dashboard can be edited");
  const old = extra[i];
  const asset = build({ ...input, kind: old.kind, id: old.id }, old);
  const others = [...CZ_ASSETS, ...extra.filter((a) => a.key !== key)];
  if (others.some((a) => a.kind === asset.kind && a.match === asset.match)) throw new Error(`Another ${asset.kind} is already called "${asset.label}"`);
  extra[i] = asset;
  await writeExtraAssets(extra);
  const kept = new Set([asset.custom?.image?.fileId, asset.custom?.spine?.fileId]);
  await deleteFiles([old.custom?.image?.fileId, old.custom?.spine?.fileId].filter((f): f is string => !!f && !kept.has(f)));
  return asset;
}

/** Deletes an asset added from the admin, with its images. Its stock count is dropped by the caller. */
export async function deleteAsset(key: string): Promise<CzAsset> {
  const extra = await readExtraAssets();
  const asset = extra.find((a) => a.key === key);
  if (!asset) throw new Error("Only assets added from the dashboard can be deleted");
  await writeExtraAssets(extra.filter((a) => a.key !== key));
  await deleteFiles([asset.custom?.image?.fileId, asset.custom?.spine?.fileId].filter((f): f is string => !!f));
  return asset;
}

/**
 * What the theme's catalogue snippet appends for the customizer: new covers, strings, charms and
 * patches in the catalogue's own shape, the image files the customizer should load for them, and
 * each new cover's borrowed positions. Lists of {id, v} rather than maps, so Liquid can loop them.
 */
export async function publishStorefrontCatalog(extra?: CzAsset[]): Promise<void> {
  const assets = (extra ?? (await readExtraAssets())).filter((a) => CZ_STOREFRONT_KINDS.includes(a.kind) && a.custom);
  const out = {
    covers: [] as unknown[],
    strings: [] as unknown[],
    charms: [] as unknown[],
    patches: [] as unknown[],
    files: [] as { name: string; url: string }[],
    face: [] as { id: string; v: unknown }[],
    spine: [] as { id: string; v: unknown }[],
    geo: [] as { id: string; v: unknown }[],
  };
  for (const a of assets) {
    const c = a.custom!;
    switch (a.kind) {
      case "cover": {
        out.covers.push({ id: a.id, label: a.label, family: a.group === "Animal print" ? "animal" : "classic", ci: c.ci || a.label });
        if (c.image) out.files.push({ name: `cz-cover-${a.id}-face.webp`, url: c.image.url });
        if (c.spine) out.files.push({ name: `cz-cover-${a.id}-spine.webp`, url: c.spine.url });
        const g = c.positionedLike ? CZ_COVER_GEOMETRY[c.positionedLike] : undefined;
        if (g?.face) out.face.push({ id: a.id, v: g.face });
        if (g?.spine) out.spine.push({ id: a.id, v: g.spine });
        if (g?.geo) out.geo.push({ id: a.id, v: g.geo });
        break;
      }
      case "string":
        out.strings.push({ id: a.id, label: a.label, hex: c.hex });
        break;
      case "charm": {
        const aspect = c.image && c.image.height ? Math.round((c.image.width / c.image.height) * 1000) / 1000 : 0.7;
        out.charms.push({ c: a.id, s: (a.group ?? "Size M").slice(-1), a: aspect });
        if (c.image) out.files.push({ name: `cz-charm-${a.id}.webp`, url: c.image.url });
        break;
      }
      case "patch":
        out.patches.push({ id: a.id, label: a.label });
        if (c.image) out.files.push({ name: `cz-patch-${a.id}.webp`, url: c.image.url });
        break;
    }
  }
  await setShopJson(PUBLIC_KEY, out, "Failed to publish the new assets to the storefront");
}
