/**
 * Copy of the design catalogue the theme's customizer ships in its `SanayaCzData` (theme
 * "Abyss | OPT - CZ staging", snippets/sanaya-cz-catalog.liquid, catalogue version "2").
 * We only READ their theme; this is a static mirror so the admin can list every asset.
 * The `id`s are the ones their storefront JS uses, so they line up with their `soldOut`
 * lists. If the catalogue there changes (new cover, charm...), update this file.
 */
export type CzKind = "cover" | "string" | "charm" | "patch" | "notebook" | "corner" | "pen";

export interface CzAsset {
  key: string; // `${kind}:${id}`, the ledger key
  kind: CzKind;
  id: string;
  label: string;
  /** Label as it appears in the order's line-item properties (for matching orders back to assets). */
  match: string;
  /** Theme image file (relative to the theme's assets folder) for a thumbnail, if any. */
  image?: string;
  group?: string;
}

const a = (kind: CzKind, id: string, label: string, extra: Partial<CzAsset> = {}): CzAsset => ({
  key: `${kind}:${id}`,
  kind,
  id,
  label,
  match: label,
  ...extra,
});

const COVERS: [string, string, "classic" | "animal", string?][] = [
  ["classic-black", "Black", "classic"],
  ["classic-brown", "Brown", "classic"],
  ["classic-pink", "Pink", "classic"],
  ["classic-blue", "Blue", "classic"],
  ["an-cheetah", "Cheetah", "animal"],
  ["an-zebra", "Zebra", "animal"],
  ["an-cow", "Cow", "animal"],
  ["an-red", "Red croc", "animal"],
  ["an-green", "Green croc", "animal"],
  ["an-black", "Black croc", "animal"],
  ["an-silver", "Silver croc", "animal"],
];

const STRINGS: [string, string][] = [
  ["black", "Black"], ["brown", "Brown"], ["red", "Red"], ["fuchsia", "Fuchsia"], ["light-pink", "Light Pink"],
  ["orange", "Orange"], ["yellow", "Yellow"], ["light-blue", "Light Blue"], ["lilac", "Lilac"], ["grey", "Grey"], ["white", "White"],
];

/** `ci` is what the order stores for a notebook. */
const NOTEBOOKS: [string, string, string][] = [
  ["todo", "To-Do", "To-Do List"],
  ["lined", "Lined", "Lined Notebook"],
  ["blank", "Blank", "Blank Notebook"],
  ["grid", "Grid", "Grid Notebook"],
];

const PATCHES: [string, string][] = [
  ["heart-black", "Black heart"], ["heart-olive", "Olive heart"], ["heart-red", "Red heart"], ["heart-silver", "Silver glitter heart"],
  ["star-brown", "Brown star"], ["star-olive", "Olive star"], ["star-burgundy", "Burgundy star"], ["star-gold", "Gold glitter star"], ["star-silver", "Silver glitter star"],
];

/** Charms 1-7 are size L, 8-52 size M, 53-88 size S. */
const charmSize = (n: number) => (n <= 7 ? "L" : n <= 52 ? "M" : "S");

export const CZ_ASSETS: CzAsset[] = [
  ...COVERS.map(([id, label, family]) =>
    a("cover", id, label, { image: `cz-cover-${id}-face.webp`, group: family === "classic" ? "Classic leather" : "Animal print" })
  ),
  ...STRINGS.map(([id, label]) => a("string", id, label)),
  ...Array.from({ length: 88 }, (_, i) => {
    const n = i + 1;
    const size = charmSize(n);
    return a("charm", String(n), `Charm ${n}`, { match: String(n), image: `cz-charm-${n}.webp`, group: `Size ${size}` });
  }),
  ...PATCHES.map(([id, label]) => a("patch", id, label, { image: `cz-patch-${id}.webp` })),
  ...NOTEBOOKS.map(([id, label, ci]) => a("notebook", id, label, { match: ci, image: `cz-notebook-${id}.webp` })),
  a("corner", "gold", "Gold"),
  a("corner", "silver", "Silver"),
  a("pen", "black", "Black"),
  a("pen", "brown", "Brown"),
];

export const CZ_KIND_LABEL: Record<CzKind, string> = {
  cover: "Covers",
  string: "Strings",
  charm: "Charms",
  patch: "Patches",
  notebook: "Notebooks",
  corner: "Metal corners",
  pen: "Pen holder colours",
};

export const CZ_KIND_ORDER: CzKind[] = ["cover", "string", "charm", "patch", "notebook", "corner", "pen"];

/** The journal product whose order lines carry the customizer's choices as properties. */
export const CZ_JOURNAL_PRODUCT_ID = "16324126835033";
export const CZ_ORDER_SOURCE = "sanaya-cz-v1";
