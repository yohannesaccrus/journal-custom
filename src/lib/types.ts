export type CoverCategory = "classic" | "pattern";

export type CharmSide = "front" | "back" | "side";

export interface PlacedCharm {
  /** Locally-generated id for this placement instance, not a Shopify id. */
  instanceId: string;
  /** Shopify ProductVariant gid for this charm design. */
  variantId: string;
  design: string;
  side: CharmSide;
  /** Position as a percentage (0-100) of the preview canvas. */
  x: number;
  y: number;
}

export interface JournalSelection {
  /** Shopify product handle, e.g. "sanaya-journal-classic-black" */
  cover: string;
  /** Shopify Cord option value (e.g. "Light Blue"), or "none" */
  cord: string | "none";
  penHolder: "none" | "black" | "brown";
  /** Corner-edge accent color, or "none". Encoded on the Pen Holder option as a suffix, e.g. "Black + Gold Edge" (see `stringValueFor`/`resolveVariant` in catalog.ts). */
  edge: "none" | "gold" | "silver";
  /** Patch sitting at the cord's knot — only meaningful when a cord is chosen. Baked into the front photo itself, not a floating overlay. */
  patch: "none" | "brown-heart" | "brown-star" | "red-heart" | "red-star" | "sparkle-heart" | "sparkle-star";
  charms: PlacedCharm[];
  /** Notebook Type (Shopify option value) -> quantity chosen. Must total exactly 3. */
  notebooks: Record<string, number>;
  /** Free-text description of what the customer wants inside their "Extra Notebook" — that design's content isn't fixed like the others. */
  notebooksNote: string;
  /** Whether the customer added the plastic pouch add-on. Its own standalone Shopify product/variant (like charms) — doesn't affect the cover photo, so it's not baked into the journal variant matrix. */
  pouch: boolean;
}
