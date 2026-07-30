import type { ShopifyJournalProduct, ShopifyVariant } from "./shopify-admin";
import type { CoverCategory, JournalSelection } from "./types";

/** Presentational-only swatch colors — Shopify has no concept of a color swatch. */
export const SWATCH_HEX: Record<string, string> = {
  Black: "#1c1c1c",
  Brown: "#6b4226",
  Red: "#b5342c",
  Orange: "#e07a2f",
  Fuchsia: "#c2185b",
  "Light Blue": "#a9d0e0",
  "Light Pink": "#f0c4d0",
};

/** Legacy fallback for the original 2 classic covers, created before category was tracked as a tag. */
const CLASSIC_HANDLES = new Set(["sanaya-journal-classic-black", "sanaya-journal-classic-brown"]);

export const COVER_CATEGORY_TAG: Record<CoverCategory, string> = {
  classic: "category:classic",
  pattern: "category:pattern",
};

function coverCategory(p: ShopifyJournalProduct): CoverCategory {
  if (p.tags.includes(COVER_CATEGORY_TAG.classic)) return "classic";
  if (p.tags.includes(COVER_CATEGORY_TAG.pattern)) return "pattern";
  return CLASSIC_HANDLES.has(p.handle) ? "classic" : "pattern";
}

/** Flat approximation of each cover's base tone, used for the back-side canvas (no back photography exists). */
export const COVER_BACK_COLOR: Record<string, string> = {
  "sanaya-journal-classic-black": "#1c1c1c",
  "sanaya-journal-classic-brown": "#5c3a21",
  "sanaya-journal-bambi": "#c78a4a",
  "sanaya-journal-zebra": "#e8e0d0",
  "sanaya-journal-cheetah": "#d9c9a3",
  "sanaya-journal-cow": "#efe9df",
  "sanaya-journal-green-crocodile": "#1f4d3d",
  "sanaya-journal-red-crocodile": "#7a1f1f",
};

export interface CoverEntry {
  handle: string;
  label: string;
  category: CoverCategory;
  swatch?: string;
  thumbnail?: string;
  priceDelta: number;
  inStock: boolean;
}

function optionValue(variant: ShopifyVariant, name: string): string | undefined {
  return variant.selectedOptions.find((o) => o.name === name)?.value;
}

/** Whether a variant can actually be added to cart right now. */
function inStock(variant: ShopifyVariant | undefined): boolean {
  return (variant?.inventoryQuantity ?? 0) > 0;
}

function baseVariant(product: ShopifyJournalProduct): ShopifyVariant | undefined {
  return product.variants.find(
    (v) => optionValue(v, "String") === "No Cord" && optionValue(v, "Pen Holder") === "None"
  );
}

/**
 * A malformed "tag:journal" product (e.g. a cover creation that failed
 * partway through — see `createJournalCoverProduct`) must never take down
 * the whole storefront build. Skip it instead of throwing, same as any
 * product still missing photos/stock.
 */
export function buildCoverEntries(products: ShopifyJournalProduct[]): CoverEntry[] {
  const withBase = products
    .map((p) => ({ p, base: baseVariant(p) }))
    .filter((x): x is { p: ShopifyJournalProduct; base: ShopifyVariant } => !!x.base);
  const globalBase = Math.min(...withBase.map((x) => Number(x.base.price)));
  return withBase.map(({ p, base }) => {
    const label = optionValue(base, "Cover") ?? p.title;
    const category = coverCategory(p);
    return {
      handle: p.handle,
      label,
      category,
      // Always prefer the real product photo — falls back to a flat color
      // swatch only if a variant somehow has no image yet.
      thumbnail: base.image?.url,
      swatch: base.image?.url ? undefined : SWATCH_HEX[label.replace("Classic ", "")],
      priceDelta: Number(base.price) - globalBase,
      inStock: inStock(base),
    };
  });
}

export interface CordEntry {
  label: string;
  swatch: string;
  inStock: boolean;
}

/**
 * `product` is the currently selected cover — stock is per (cover, string)
 * variant. `swatchByLabel` is the live admin-edited swatch map (see
 * `fetchSwatchColors` in `shopify-admin.ts`); `SWATCH_HEX` is only a fallback
 * for colors that predate that metafield being set.
 */
export function buildCordEntries(product: ShopifyJournalProduct, swatchByLabel: Record<string, string> = {}): CordEntry[] {
  const values = new Set(
    product.variants.map((v) => optionValue(v, "String")).filter((v): v is string => !!v && v !== "No Cord")
  );
  return Array.from(values).map((label) => {
    const variant = product.variants.find(
      (v) => optionValue(v, "String") === label && optionValue(v, "Pen Holder") === "None"
    );
    return { label, swatch: swatchByLabel[label] ?? SWATCH_HEX[label] ?? "#999999", inStock: inStock(variant) };
  });
}

export interface PenHolderEntry {
  label: string;
  swatch: string;
  inStock: boolean;
}

/** `cord` is the currently selected/effective cord — stock is per (cover, string, pen holder) variant. */
export function buildPenHolderEntries(
  product: ShopifyJournalProduct,
  cord: string,
  swatchByLabel: Record<string, string> = {}
): PenHolderEntry[] {
  const cordValue = cord === "none" ? "No Cord" : cord;
  const values = new Set(
    product.variants
      .map((v) => optionValue(v, "Pen Holder"))
      .filter((v): v is string => !!v && v !== "None" && !v.includes("+ Edge"))
  );
  return Array.from(values).map((label) => {
    const variant = product.variants.find(
      (v) => optionValue(v, "String") === cordValue && optionValue(v, "Pen Holder") === label
    );
    return { label, swatch: swatchByLabel[label] ?? SWATCH_HEX[label] ?? "#999999", inStock: inStock(variant) };
  });
}

/** Whether the corner-edge add-on is in stock for the current cord + pen holder. */
export function isEdgeInStock(
  product: ShopifyJournalProduct,
  cord: string,
  penHolder: Exclude<JournalSelection["penHolder"], "none">
): boolean {
  const cordValue = cord === "none" ? "No Cord" : cord;
  const cap = penHolder === "black" ? "Black" : "Brown";
  const variant = product.variants.find(
    (v) => optionValue(v, "String") === cordValue && optionValue(v, "Pen Holder") === `${cap} + Edge`
  );
  return inStock(variant);
}

/** Resolves the exact Shopify variant matching a customizer selection. */
export function resolveVariant(
  product: ShopifyJournalProduct,
  selection: JournalSelection
): ShopifyVariant {
  const cordValue = selection.cord === "none" ? "No Cord" : selection.cord;
  let penValue = "None";
  if (selection.penHolder !== "none") {
    const cap = selection.penHolder === "black" ? "Black" : "Brown";
    penValue = selection.edge ? `${cap} + Edge` : cap;
  }

  const match = product.variants.find(
    (v) =>
      optionValue(v, "String") === cordValue &&
      optionValue(v, "Pen Holder") === penValue
  );
  if (!match) {
    throw new Error(
      `No variant found for ${product.handle} with Cord=${cordValue}, Pen Holder=${penValue}`
    );
  }
  return match;
}

export interface CharmEntry {
  variantId: string;
  design: string;
  imageUrl: string;
  price: number;
  inStock: boolean;
}

export function buildCharmEntries(charmProduct: ShopifyJournalProduct): CharmEntry[] {
  return charmProduct.variants.map((v) => ({
    variantId: v.id,
    design: optionValue(v, "Design") ?? v.title,
    imageUrl: v.image?.url ?? "",
    price: Number(v.price),
    inStock: inStock(v),
  }));
}

export function charmsTotal(charmProduct: ShopifyJournalProduct, charms: { variantId: string }[]): number {
  const priceByVariant = new Map(charmProduct.variants.map((v) => [v.id, Number(v.price)]));
  return charms.reduce((sum, c) => sum + (priceByVariant.get(c.variantId) ?? 0), 0);
}

const CORD_SLUG: Record<string, string> = {
  Black: "black",
  Brown: "brown",
  Red: "red",
  Orange: "orange",
  Fuchsia: "fuchsia",
  "Light Blue": "light-blue",
  "Light Pink": "light-pink",
};

/**
 * Resolves the generated back/side charm-placement view matching the current
 * cord + edge selection (pen holder is irrelevant to these views). These are
 * stand-in renders — no back/side photography exists — uploaded as extra
 * product media tagged e.g. "back-cord-red-edge" / "side-cord-none".
 *
 * The patch sits on the cord's front-facing knot only, so it never affects
 * back/side — those views always use the plain cord[+edge] render regardless
 * of `selection.patch`.
 */
export function resolveSideImage(
  product: ShopifyJournalProduct,
  view: "back" | "side",
  selection: Pick<JournalSelection, "cord" | "edge" | "patch">
): string | undefined {
  const cordSlug = selection.cord === "none" ? "none" : (CORD_SLUG[selection.cord] ?? "none");

  const edgeSuffix = selection.edge && selection.cord !== "none" ? "-edge" : "";
  const alt = `${view}-cord-${cordSlug}${edgeSuffix}`;
  return product.media.find((m) => m.alt === alt)?.url;
}

export const NOTEBOOKS_PER_JOURNAL = 3;

/** Shown to the customer under the notebook picker — matches the physical spec of every notebook. */
export const NOTEBOOK_SPEC_NOTE =
  "All notebooks: black Sanaya-branded cover, 80gsm, 50 sheets / 100 pages. To-Do List has ivory pages, the others have white pages.";

export interface NotebookEntry {
  variantId: string;
  design: string;
  inStock: boolean;
}

export function buildNotebookEntries(notebookProduct: ShopifyJournalProduct): NotebookEntry[] {
  return notebookProduct.variants.map((v) => ({
    variantId: v.id,
    design: optionValue(v, "Type") ?? v.title,
    inStock: inStock(v),
  }));
}

export function notebookCount(notebooks: Record<string, number>): number {
  return Object.values(notebooks).reduce((sum, n) => sum + n, 0);
}

export interface PatchEntry {
  variantId: string;
  shape: "star" | "heart";
  price: number;
  inStock: boolean;
}

export function buildPatchEntries(patchProduct: ShopifyJournalProduct): PatchEntry[] {
  return patchProduct.variants.map((v) => ({
    variantId: v.id,
    shape: (optionValue(v, "Shape") ?? v.title).toLowerCase() as "star" | "heart",
    price: Number(v.price),
    inStock: inStock(v),
  }));
}

export function patchPrice(patchProduct: ShopifyJournalProduct, patch: JournalSelection["patch"]): number {
  if (patch === "none") return 0;
  return buildPatchEntries(patchProduct).find((p) => p.shape === patch)?.price ?? 0;
}

/**
 * Resolves the front-cover image for the current selection. The patch is no
 * longer baked into a pre-composited photo (that only ever existed without a
 * pen holder, so choosing both made the patch disappear) — it's now drawn as
 * a floating marker on top of whichever variant photo is showing (see
 * PATCH_POSITION below), so patch and pen holder can be combined freely.
 */
export function resolveFrontImage(variant: ShopifyVariant): string {
  return variant.image?.url ?? "";
}

/** Where the patch marker sits on the front cover, as % of the preview box — matches the cord knot position in the original composited photos. */
export const PATCH_POSITION = { x: 50, y: 44, sizePercent: 17 };
