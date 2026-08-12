import type { ShopifyJournalProduct, ShopifyVariant } from "./shopify-admin";
import type { CharmSide, CoverCategory, JournalSelection, PlacedCharm } from "./types";

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

/** Legacy fallback for covers created before category was tracked as a tag. */
const CLASSIC_HANDLES = new Set(["sanaya-journal-classic-black", "sanaya-journal-classic-brown"]);

/** Every "tag:journal" product actually carries a plain "classic"/"pattern" tag (not "category:*" — that prefix was never what got written to Shopify). */
export const COVER_CATEGORY_TAG: Record<CoverCategory, string> = {
  classic: "classic",
  pattern: "pattern",
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
 * partway through -- see `createJournalCoverProduct`) must never take down
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
      // Always prefer the real product photo -- falls back to a flat color
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

/** Every non-"none" `JournalSelection["patch"]` key, in the order shown in the picker. */
export const PATCH_VALUES = ["brown-heart", "brown-star", "red-heart", "red-star", "sparkle-heart", "sparkle-star"] as const;

/** Matches the "[JC] Sanaya Patch" tracker product's variant titles — also the exact "<cord> + <label>" String suffix used on every journal product. */
export const PATCH_LABEL: Record<Exclude<JournalSelection["patch"], "none">, string> = {
  "brown-heart": "Brown Heart",
  "brown-star": "Brown Star",
  "red-heart": "Red Heart",
  "red-star": "Red Star",
  "sparkle-heart": "Sparkle Heart",
  "sparkle-star": "Sparkle Star",
};

/**
 * Shopify caps products at 3 options total (Cover, String, Pen Holder --
 * already the max), so Patch can't be its own 4th option. Instead it's
 * encoded as a suffix on the String option's own values, exactly like Pen
 * Holder already encodes the corner-edge add-on ("Black" vs "Black + Edge"):
 * a real cord's String values are "Light Pink", "Light Pink + Brown Heart",
 * "Light Pink + Sparkle Star", etc. "No Cord" never gets a patch suffix. This
 * builds the exact String value for a given (cord, patch) pair.
 */
function stringValueFor(cordSelection: string, patch: JournalSelection["patch"]): string {
  const cordValue = cordSelection === "none" ? "No Cord" : cordSelection;
  if (cordValue === "No Cord" || patch === "none") return cordValue;
  return `${cordValue} + ${PATCH_LABEL[patch]}`;
}

/**
 * `product` is the currently selected cover -- stock is per (cover, string)
 * variant. `swatchByLabel` is the live admin-edited swatch map (see
 * `fetchSwatchColors` in `shopify-admin.ts`); `SWATCH_HEX` is only a fallback
 * for colors that predate that metafield being set. Only base cord names are
 * listed here (any "<cord> + <patch>" combo is excluded) -- those are picked
 * separately in `PatchStep`, once a base cord is already selected.
 */
export function buildCordEntries(product: ShopifyJournalProduct, swatchByLabel: Record<string, string> = {}): CordEntry[] {
  const values = new Set(
    product.variants
      .map((v) => optionValue(v, "String"))
      .filter((v): v is string => !!v && v !== "No Cord" && !v.includes(" + "))
  );
  return Array.from(values).map((label) => {
    const variant = product.variants.find(
      (v) => optionValue(v, "String") === label && optionValue(v, "Pen Holder") === "None"
    );
    return { label, swatch: swatchByLabel[label] ?? SWATCH_HEX[label] ?? "#999999", inStock: inStock(variant) };
  });
}

export const EDGE_VALUES = ["gold", "silver"] as const;
export const EDGE_LABEL: Record<Exclude<JournalSelection["edge"], "none">, string> = {
  gold: "Gold",
  silver: "Silver",
};

/** Builds the Pen Holder option value for a given pen holder + edge color, e.g. "Black + Gold Edge". `penHolder` must not be "none". */
function penHolderValueFor(penHolder: Exclude<JournalSelection["penHolder"], "none">, edge: JournalSelection["edge"]): string {
  const cap = penHolder === "black" ? "Black" : "Brown";
  return edge === "none" ? cap : `${cap} + ${EDGE_LABEL[edge]} Edge`;
}

export interface PenHolderEntry {
  label: string;
  swatch: string;
  inStock: boolean;
}

/** `cord`/`patch` are the currently selected/effective values -- stock is per (cover, string [+ patch], pen holder) variant. */
export function buildPenHolderEntries(
  product: ShopifyJournalProduct,
  cord: string,
  patch: JournalSelection["patch"],
  swatchByLabel: Record<string, string> = {}
): PenHolderEntry[] {
  const stringValue = stringValueFor(cord, patch);
  const values = new Set(
    product.variants
      .map((v) => optionValue(v, "Pen Holder"))
      .filter((v): v is string => !!v && v !== "None" && !v.includes(" + "))
  );
  return Array.from(values).map((label) => {
    const variant = product.variants.find(
      (v) => optionValue(v, "String") === stringValue && optionValue(v, "Pen Holder") === label
    );
    return { label, swatch: swatchByLabel[label] ?? SWATCH_HEX[label] ?? "#999999", inStock: inStock(variant) };
  });
}

/** Whether the given corner-edge color is in stock for the current cord [+ patch] + pen holder. */
export function isEdgeInStock(
  product: ShopifyJournalProduct,
  cord: string,
  penHolder: Exclude<JournalSelection["penHolder"], "none">,
  edge: Exclude<JournalSelection["edge"], "none">,
  patch: JournalSelection["patch"] = "none"
): boolean {
  const stringValue = stringValueFor(cord, patch);
  const variant = product.variants.find(
    (v) => optionValue(v, "String") === stringValue && optionValue(v, "Pen Holder") === penHolderValueFor(penHolder, edge)
  );
  return inStock(variant);
}

/** Resolves the exact Shopify variant matching a customizer selection. */
export function resolveVariant(
  product: ShopifyJournalProduct,
  selection: JournalSelection
): ShopifyVariant {
  // The patch is stitched onto the string itself, so it can never apply
  // without one -- same rule enforced client-side in PatchStep/JournalCustomizer.
  const stringValue = stringValueFor(selection.cord, selection.patch);
  const penValue = selection.penHolder === "none" ? "None" : penHolderValueFor(selection.penHolder, selection.edge);

  const match = product.variants.find(
    (v) => optionValue(v, "String") === stringValue && optionValue(v, "Pen Holder") === penValue
  );
  if (!match) {
    throw new Error(`No variant found for ${product.handle} with String=${stringValue}, Pen Holder=${penValue}`);
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

/** Client spec: 11 charms max per journal — 5 on the front, 6 on the side.
 * Back has no per-view cap of its own (the client only named front/side, and
 * 5 + 6 already accounts for the full 11), so it's bounded by the shared
 * total only. */
export const MAX_CHARMS_TOTAL = 11;
export const MAX_CHARMS_FRONT = 5;
export const MAX_CHARMS_SIDE = 6;

export function charmSideLimit(side: CharmSide): number | null {
  if (side === "front") return MAX_CHARMS_FRONT;
  if (side === "side") return MAX_CHARMS_SIDE;
  return null;
}

export function canPlaceCharm(charms: PlacedCharm[], side: CharmSide): boolean {
  if (charms.length >= MAX_CHARMS_TOTAL) return false;
  const sideLimit = charmSideLimit(side);
  if (sideLimit === null) return true;
  return charms.filter((c) => c.side === side).length < sideLimit;
}

/** "[JC] Sanaya Pouch" is a single-variant product — this is just that one variant. */
export function resolvePouchVariant(pouchProduct: ShopifyJournalProduct): ShopifyVariant | undefined {
  return pouchProduct.variants[0];
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
 * cord [+ edge color] selection (pen holder is irrelevant to these views).
 * Uploaded as extra product media tagged e.g. "back-cord-red-corner-gold" /
 * "side-cord-none". Only the back view has real corner-edge photography —
 * side never shows the corner accents (no such assets), so its alt always
 * omits the edge color regardless of selection.
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

  const edgeSuffix =
    view === "back" && selection.edge !== "none" && selection.cord !== "none" ? `-corner-${selection.edge}` : "";
  const alt = `${view}-cord-${cordSlug}${edgeSuffix}`;
  return product.media.find((m) => m.alt === alt)?.url;
}

export const NOTEBOOKS_PER_JOURNAL = 3;

/** Shown to the customer under the notebook picker — matches the physical spec of every notebook. */
export const NOTEBOOK_SPEC_NOTE =
  "All notebooks: black Sanaya-branded cover, 80gsm, 50 sheets / 100 pages. To-Do List has ivory pages, the others have white pages. Extra Notebook content is fully customizable — tell us what you'd like inside.";

export interface NotebookEntry {
  variantId: string;
  design: string;
  inStock: boolean;
  imageUrl: string | null;
}

export function buildNotebookEntries(notebookProduct: ShopifyJournalProduct): NotebookEntry[] {
  return notebookProduct.variants.map((v) => ({
    variantId: v.id,
    design: optionValue(v, "Type") ?? v.title,
    inStock: inStock(v),
    imageUrl: v.image?.url ?? null,
  }));
}

export function notebookCount(notebooks: Record<string, number>): number {
  return Object.values(notebooks).reduce((sum, n) => sum + n, 0);
}

export interface PatchEntry {
  value: Exclude<JournalSelection["patch"], "none">;
  label: string;
  /** Picker thumbnail — the "[JC] Sanaya Patch" tracker variant's own photo, not the composited cover photo. */
  thumbnail?: string;
  /** Delta vs. the same String/Pen Holder combo with no patch — the patch's own price is baked into that exact variant on the journal product, not a separate line item. */
  price: number;
  inStock: boolean;
}

/**
 * The patch is stitched onto the string itself (real photography now, no
 * graphic overlay), so it's encoded as a suffix on the String option's own
 * value (Shopify caps products at 3 options — see `stringValueFor`) —
 * never available without a real cord (`cord === "none"`), same rule
 * `resolveVariant`/`PatchStep` enforce. `cord`/`penHolder`/`edge` are the
 * currently selected/effective values — price shown is the delta vs. the
 * matching no-patch variant, and stock is per (cover, string + patch, pen
 * holder) variant.
 */
export function buildPatchEntries(
  product: ShopifyJournalProduct,
  cord: JournalSelection["cord"],
  penHolder: JournalSelection["penHolder"],
  edge: JournalSelection["edge"],
  patchProduct?: ShopifyJournalProduct
): PatchEntry[] {
  if (cord === "none") return [];
  const penValue = penHolder === "none" ? "None" : penHolderValueFor(penHolder, edge);
  const findVariant = (patch: JournalSelection["patch"]) =>
    product.variants.find(
      (v) => optionValue(v, "String") === stringValueFor(cord, patch) && optionValue(v, "Pen Holder") === penValue
    );
  const baseline = Number(findVariant("none")?.price ?? 0);
  return PATCH_VALUES.map((value) => {
    const variant = findVariant(value);
    const label = PATCH_LABEL[value];
    const thumbnail = patchProduct?.variants.find((v) => v.title === label)?.image?.url;
    return {
      value,
      label,
      thumbnail,
      price: variant ? Number(variant.price) - baseline : 0,
      inStock: inStock(variant),
    };
  });
}

/**
 * Resolves the front-cover image for the current selection — the patch (if
 * any) is baked directly into this variant's own photo. Corner Edge x Patch
 * combos would need ~300 unique front photos per cover (over Shopify's
 * 250-media-per-product cap), so those live as a `frontImageOverride`
 * variant metafield (a Shopify File, not product media -- no cap) instead of
 * `variant.image`; every other combo just uses `variant.image` as before.
 */
export function resolveFrontImage(variant: ShopifyVariant): string {
  return variant.frontImageOverride?.value ?? variant.image?.url ?? "";
}

/** Where the patch marker sits on the front cover, as % of the preview box — only used as a fallback (see the "Fallback only" comments at each call site) for a specific combo that has no real photo yet. */
export const PATCH_POSITION = { x: 50, y: 44, sizePercent: 17 };
