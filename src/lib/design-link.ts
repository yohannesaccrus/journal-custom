import type { CharmSide, JournalSelection } from "./types";

/** Every charm variant gid always looks like gid://shopify/ProductVariant/<digits> — storing just the digits keeps the design link far shorter. */
function charmVariantToId(gid: string): number {
  const match = gid.match(/(\d+)$/);
  return match ? Number(match[1]) : 0;
}
function idToCharmVariant(id: number): string {
  return `gid://shopify/ProductVariant/${id}`;
}

/** btoa/atob are global in both browsers and modern Node/Edge runtimes, so this works identically client- and server-side without a Buffer polyfill. */
function toBase64Url(json: string): string {
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromBase64Url(encoded: string): string {
  const b64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), "="));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/**
 * Encodes a finished customization into a compact, URL-safe payload so it can
 * be shared as a link (e.g. attached to a Shopify cart/checkout line item
 * property) that reopens a read-only view of exactly what the customer
 * designed — including charm placement, which can't be baked into a static
 * Shopify variant photo since positions are freeform. Base64url (rather than
 * encodeURIComponent) keeps the link short, since Shopify's checkout shows
 * it as raw, unstyled, non-clickable text — the shorter and cleaner the
 * better.
 */
export function encodeDesign(selection: JournalSelection): string {
  const compact = {
    c: selection.cover,
    cd: selection.cord,
    p: selection.penHolder,
    e: selection.edge,
    pa: selection.patch,
    ch: selection.charms.map((c) => [
      charmVariantToId(c.variantId),
      c.design,
      c.side,
      Math.round(c.x),
      Math.round(c.y),
    ]),
    nb: selection.notebooks,
  };
  return toBase64Url(JSON.stringify(compact));
}

export function decodeDesign(encoded: string): JournalSelection | null {
  try {
    const compact = JSON.parse(fromBase64Url(encoded));
    return {
      cover: compact.c,
      cord: compact.cd,
      penHolder: compact.p,
      edge: compact.e,
      patch: compact.pa ?? "none",
      charms: (compact.ch as [number, string, CharmSide, number, number][]).map(([variantId, design, side, x, y]) => ({
        instanceId: `${variantId}-${side}-${x}-${y}`,
        variantId: idToCharmVariant(variantId),
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
