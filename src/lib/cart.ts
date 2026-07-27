import type { ShopifyJournalProduct, ShopifyVariant } from "./shopify-admin";
import type { JournalSelection } from "./types";
import { buildDesignUrl } from "./design-link";

export interface CartLineItem {
  id: number;
  /** Shopify ProductVariant gid — needed for draftOrderCreate, which (unlike /cart/add.js) accepts variants from unpublished/draft products. */
  variantId: string;
  quantity: number;
  properties?: Record<string, string>;
}

export interface CartPayload {
  items: CartLineItem[];
  /**
   * Cart-level (order) attributes, to be sent alongside `items` as the
   * `attributes` field of the /cart/add.js (or a follow-up /cart/update.js)
   * request. Unlike line-item `properties`, these survive Shopify's native
   * Bundle explosion — when the journal variant is configured as a Bundle,
   * its line item gets replaced at order-creation time by separate lines for
   * each bundle component (e.g. "Sanaya Component — Cover", "— Cord"), and
   * whatever `properties` were set on the original bundle line are dropped
   * entirely. The design preview link has to live here instead, or it's
   * unrecoverable once the order exists.
   */
  attributes: Record<string, string>;
}

/** Shopify's cart AJAX API (/cart/add.js) wants the plain numeric variant id, not the GraphQL gid. */
export function toLegacyId(gid: string): number {
  const match = gid.match(/(\d+)$/);
  if (!match) throw new Error(`Invalid Shopify gid: ${gid}`);
  return Number(match[1]);
}

function newBundleId(): string {
  return `sanaya-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Builds the /cart/add.js line items for a customized journal: one line for
 * the journal variant itself (with cord/pen holder/edge/notebooks recorded as
 * customer-visible properties), plus one line per distinct charm+placement
 * combo (charms are separately priced, published products with their own
 * variant ids). All lines share a hidden `_bundle_id` property (Shopify hides
 * property keys starting with "_" from cart/checkout UI) so fulfillment can
 * tell which charms belong to which journal within a multi-journal order.
 */
export function buildCartItems(
  variant: ShopifyVariant,
  charmProduct: ShopifyJournalProduct,
  patchProduct: ShopifyJournalProduct,
  selection: JournalSelection,
  designPageOrigin: string
): CartPayload {
  const bundleId = newBundleId();

  const properties: Record<string, string> = {};
  if (selection.cord !== "none") properties["String"] = selection.cord;
  if (selection.patch !== "none") {
    properties["Patch"] = selection.patch.charAt(0).toUpperCase() + selection.patch.slice(1);
  }
  if (selection.penHolder !== "none") {
    properties["Pen Holder"] = selection.penHolder === "black" ? "Black" : "Brown";
    properties["Corner Edge"] = selection.edge ? "Yes" : "No";
  }
  const notebookEntries = Object.entries(selection.notebooks);
  if (notebookEntries.length > 0) {
    properties["Notebooks"] = notebookEntries.map(([design, count]) => `${count}× ${design}`).join(", ");
  }
  // Charm placement is freeform, so it can't be baked into the variant photo —
  // link to a read-only page that renders exactly what the customer designed.
  // Also set as a `properties` value below (so it still shows on the cart page
  // before checkout), but the cart-level `attributes` copy is the one that
  // actually survives once the order is created — see `CartPayload`.
  const designUrl = buildDesignUrl(designPageOrigin, selection);
  properties["✨ Tap to preview your custom journal"] = designUrl;
  properties["_bundle_id"] = bundleId;

  const items: CartLineItem[] = [
    { id: toLegacyId(variant.id), variantId: variant.id, quantity: 1, properties },
  ];

  if (selection.patch !== "none") {
    const patchVariant = patchProduct.variants.find(
      (v) => v.title.toLowerCase() === selection.patch
    );
    if (patchVariant) {
      items.push({
        id: toLegacyId(patchVariant.id),
        variantId: patchVariant.id,
        quantity: 1,
        properties: { _for_journal: bundleId },
      });
    }
  }

  const charmGroups = new Map<string, { variantId: string; side: string; count: number }>();
  for (const c of selection.charms) {
    const key = `${c.variantId}__${c.side}`;
    const existing = charmGroups.get(key);
    if (existing) existing.count += 1;
    else charmGroups.set(key, { variantId: c.variantId, side: c.side, count: 1 });
  }
  for (const g of charmGroups.values()) {
    items.push({
      id: toLegacyId(g.variantId),
      variantId: g.variantId,
      quantity: g.count,
      properties: {
        Placement: g.side.charAt(0).toUpperCase() + g.side.slice(1),
        _for_journal: bundleId,
      },
    });
  }

  return {
    items,
    attributes: { [`✨ Preview your custom journal — ${bundleId}`]: designUrl },
  };
}
