import "server-only";
import { shopifyAdmin } from "@/lib/admin/shopify-admin-data";
import { readAllAssets } from "@/lib/admin/cz-catalog-store";
import { fetchCzUses } from "@/lib/admin/cz-usage";

/**
 * Per-asset stock the storefront customizer knows nothing about (a cover or a charm is not a
 * Shopify product), kept in OUR shop metafield `sanaya.cz_stock` -- the same mechanism as the
 * EUR/IDR rate. Each entry is a physical count taken at `asOf`; what has been used since then
 * is derived from orders (see cz-usage.ts), so nothing here has to be decremented and a
 * recount simply replaces the entry. Not exposed to the storefront.
 */
const NAMESPACE = "sanaya";
const KEY = "cz_stock";

export interface CzLedgerEntry {
  /** Physical count at `asOf`. */
  qty: number;
  asOf: string; // ISO timestamp
}
export type CzLedger = Record<string, CzLedgerEntry>;

export async function readCzLedger(): Promise<CzLedger> {
  const data = await shopifyAdmin<{ shop: { metafield: { value: string } | null } }>(
    `query { shop { metafield(namespace: "${NAMESPACE}", key: "${KEY}") { value } } }`
  );
  const raw = data.shop.metafield?.value;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as CzLedger;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function writeCzLedger(ledger: CzLedger): Promise<void> {
  const shop = await shopifyAdmin<{ shop: { id: string } }>(`query { shop { id } }`);
  const result = await shopifyAdmin<{ metafieldsSet: { userErrors: { message: string }[] } }>(
    `mutation($m: [MetafieldsSetInput!]!) { metafieldsSet(metafields: $m) { userErrors { message } } }`,
    { m: [{ ownerId: shop.shop.id, namespace: NAMESPACE, key: KEY, type: "json", value: JSON.stringify(ledger) }] }
  );
  if (result.metafieldsSet.userErrors.length) {
    throw new Error(`Failed to save stock: ${JSON.stringify(result.metafieldsSet.userErrors)}`);
  }
}

/** The built-in catalogue plus assets added from the admin can all be counted. */
async function assertKnownAsset(key: string) {
  if (!(await readAllAssets()).some((x) => x.key === key)) throw new Error(`Unknown asset ${key}`);
}

/** Records a recount: "there are `qty` of this asset right now". */
export async function setCzAssetStock(key: string, qty: number): Promise<CzLedger> {
  await assertKnownAsset(key);
  if (!Number.isInteger(qty) || qty < 0) throw new Error("Stock must be a whole number, 0 or more");
  const ledger = await readCzLedger();
  ledger[key] = { qty, asOf: new Date().toISOString() };
  await writeCzLedger(ledger);
  return ledger;
}

/**
 * Adds or removes units relative to what is left right now (count minus what orders used since
 * the last count), then records that as a fresh count. Needs an earlier count to start from.
 */
export async function adjustCzAssetStock(key: string, delta: number): Promise<CzLedger> {
  await assertKnownAsset(key);
  if (!Number.isInteger(delta) || delta === 0) throw new Error("Amount must be a whole number, not 0");
  const ledger = await readCzLedger();
  const entry = ledger[key];
  if (!entry) throw new Error("No count yet for this asset. Use Set first.");
  const { uses } = await fetchCzUses(entry.asOf);
  const used = uses.filter((u) => u.key === key && u.at > entry.asOf).length;
  const next = entry.qty - used + delta;
  if (next < 0) throw new Error(`Only ${entry.qty - used} left, can't remove ${-delta}`);
  ledger[key] = { qty: next, asOf: new Date().toISOString() };
  await writeCzLedger(ledger);
  return ledger;
}
