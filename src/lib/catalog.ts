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

const CLASSIC_HANDLES = new Set(["sanaya-journal-classic-black", "sanaya-journal-classic-brown"]);

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
}

function optionValue(variant: ShopifyVariant, name: string): string | undefined {
  return variant.selectedOptions.find((o) => o.name === name)?.value;
}

function baseVariant(product: ShopifyJournalProduct): ShopifyVariant {
  const found = product.variants.find(
    (v) => optionValue(v, "Cord") === "No Cord" && optionValue(v, "Pen Holder") === "None"
  );
  if (!found) throw new Error(`No base (No Cord / None) variant found for ${product.handle}`);
  return found;
}

export function buildCoverEntries(products: ShopifyJournalProduct[]): CoverEntry[] {
  const globalBase = Math.min(...products.map((p) => Number(baseVariant(p).price)));
  return products.map((p) => {
    const base = baseVariant(p);
    const label = optionValue(base, "Cover") ?? p.title;
    const category: CoverCategory = CLASSIC_HANDLES.has(p.handle) ? "classic" : "pattern";
    return {
      handle: p.handle,
      label,
      category,
      swatch: category === "classic" ? SWATCH_HEX[label.replace("Classic ", "")] : undefined,
      thumbnail: category === "pattern" ? base.image?.url : undefined,
      priceDelta: Number(base.price) - globalBase,
    };
  });
}

export function buildCordEntries(products: ShopifyJournalProduct[]): { label: string; swatch: string }[] {
  const product = products[0];
  const values = new Set(
    product.variants.map((v) => optionValue(v, "Cord")).filter((v): v is string => !!v && v !== "No Cord")
  );
  return Array.from(values).map((label) => ({ label, swatch: SWATCH_HEX[label] ?? "#999999" }));
}

export function buildPenHolderEntries(products: ShopifyJournalProduct[]): { label: string; swatch: string }[] {
  const product = products[0];
  const values = new Set(
    product.variants
      .map((v) => optionValue(v, "Pen Holder"))
      .filter((v): v is string => !!v && v !== "None" && !v.includes("+ Edge"))
  );
  return Array.from(values).map((label) => ({ label, swatch: SWATCH_HEX[label] ?? "#999999" }));
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
      optionValue(v, "Cord") === cordValue &&
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
}

export function buildCharmEntries(charmProduct: ShopifyJournalProduct): CharmEntry[] {
  return charmProduct.variants.map((v) => ({
    variantId: v.id,
    design: optionValue(v, "Design") ?? v.title,
    imageUrl: v.image?.url ?? "",
    price: Number(v.price),
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
 * On the back view specifically, a chosen patch takes priority over edge
 * (falls back to the plain cord image if that patch+cord combo has no
 * dedicated render) since patch and edge weren't both generated together.
 */
export function resolveSideImage(
  product: ShopifyJournalProduct,
  view: "back" | "side",
  selection: Pick<JournalSelection, "cord" | "edge" | "patch">
): string | undefined {
  const cordSlug = selection.cord === "none" ? "none" : (CORD_SLUG[selection.cord] ?? "none");

  if (view === "back" && selection.patch !== "none" && selection.cord !== "none") {
    const patchAlt = `back-cord-${cordSlug}-patch-${selection.patch}`;
    const patchMedia = product.media.find((m) => m.alt === patchAlt);
    if (patchMedia) return patchMedia.url;
  }

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
}

export function buildNotebookEntries(notebookProduct: ShopifyJournalProduct): NotebookEntry[] {
  return notebookProduct.variants.map((v) => ({
    variantId: v.id,
    design: optionValue(v, "Type") ?? v.title,
  }));
}

export function notebookCount(notebooks: Record<string, number>): number {
  return Object.values(notebooks).reduce((sum, n) => sum + n, 0);
}

export interface PatchEntry {
  variantId: string;
  shape: "star" | "heart";
  price: number;
}

export function buildPatchEntries(patchProduct: ShopifyJournalProduct): PatchEntry[] {
  return patchProduct.variants.map((v) => ({
    variantId: v.id,
    shape: (optionValue(v, "Shape") ?? v.title).toLowerCase() as "star" | "heart",
    price: Number(v.price),
  }));
}

export function patchPrice(patchProduct: ShopifyJournalProduct, patch: JournalSelection["patch"]): number {
  if (patch === "none") return 0;
  return buildPatchEntries(patchProduct).find((p) => p.shape === patch)?.price ?? 0;
}

/**
 * Resolves the front-cover image for the current selection. When a patch is
 * chosen, the cord must be re-rendered with the patch layered underneath it
 * (the cord visibly crosses over the patch), which can't be done as a simple
 * overlay on the existing variant photo — so we swap in a pre-composited
 * "front-cord-{color}-patch-{shape}" media image instead. That composite
 * doesn't include pen holder/edge, so once those are also chosen the preview
 * falls back to the normal variant photo (patch omitted) rather than showing
 * a mismatched combination.
 */
export function resolveFrontImage(
  product: ShopifyJournalProduct,
  variant: ShopifyVariant,
  selection: Pick<JournalSelection, "cord" | "patch" | "penHolder" | "edge">
): string {
  if (selection.patch !== "none" && selection.cord !== "none" && selection.penHolder === "none") {
    const cordSlug = CORD_SLUG[selection.cord] ?? "none";
    const alt = `front-cord-${cordSlug}-patch-${selection.patch}`;
    const media = product.media.find((m) => m.alt === alt);
    if (media) return media.url;
  }
  return variant.image?.url ?? "";
}
