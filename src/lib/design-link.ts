import type { CharmSide, JournalSelection } from "./types";

/**
 * Encodes a finished customization into a compact, URL-safe payload so it can
 * be shared as a link (e.g. attached to a Shopify cart/checkout line item
 * property) that reopens a read-only view of exactly what the customer
 * designed — including charm placement, which can't be baked into a static
 * Shopify variant photo since positions are freeform.
 */
export function encodeDesign(selection: JournalSelection): string {
  const compact = {
    c: selection.cover,
    cd: selection.cord,
    p: selection.penHolder,
    e: selection.edge,
    pa: selection.patch,
    ch: selection.charms.map((c) => [c.variantId, c.design, c.side, Math.round(c.x * 10) / 10, Math.round(c.y * 10) / 10]),
    nb: selection.notebooks,
  };
  return encodeURIComponent(JSON.stringify(compact));
}

export function decodeDesign(encoded: string): JournalSelection | null {
  try {
    const compact = JSON.parse(decodeURIComponent(encoded));
    return {
      cover: compact.c,
      cord: compact.cd,
      penHolder: compact.p,
      edge: compact.e,
      patch: compact.pa ?? "none",
      charms: (compact.ch as [string, string, CharmSide, number, number][]).map(([variantId, design, side, x, y]) => ({
        instanceId: `${variantId}-${side}-${x}-${y}`,
        variantId,
        design,
        side,
        x,
        y,
      })),
      notebooks: compact.nb ?? {},
    };
  } catch {
    return null;
  }
}

export function buildDesignUrl(baseUrl: string, selection: JournalSelection): string {
  return `${baseUrl.replace(/\/$/, "")}/design?d=${encodeDesign(selection)}`;
}
