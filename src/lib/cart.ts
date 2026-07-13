import type { ShopifyJournalProduct, ShopifyVariant } from "./shopify-admin";
import type { JournalSelection } from "./types";
import { buildDesignUrl } from "./design-link";

export interface CartLineItem {
  id: number;
  quantity: number;
  properties?: Record<string, string>;
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
  selection: JournalSelection,
  designPageOrigin: string
): CartLineItem[] {
  const bundleId = newBundleId();

  const properties: Record<string, string> = {};
  if (selection.cord !== "none") properties["Cord"] = selection.cord;
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
  properties["View your custom design"] = buildDesignUrl(designPageOrigin, selection);
  properties["_bundle_id"] = bundleId;

  const items: CartLineItem[] = [{ id: toLegacyId(variant.id), quantity: 1, properties }];

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
      quantity: g.count,
      properties: {
        Placement: g.side.charAt(0).toUpperCase() + g.side.slice(1),
        _for_journal: bundleId,
      },
    });
  }

  return items;
}
