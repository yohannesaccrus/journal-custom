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
  edge: boolean;
  /** Patch sitting at the cord's knot — only meaningful when a cord is chosen. */
  patch: "none" | "star" | "heart";
  charms: PlacedCharm[];
  /** Notebook Type (Shopify option value) -> quantity chosen. Must total exactly 3. */
  notebooks: Record<string, number>;
}
