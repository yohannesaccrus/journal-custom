import "server-only";
import { shopifyAdmin } from "@/lib/admin/shopify-admin-data";
import { CZ_ASSETS, CZ_JOURNAL_PRODUCT_ID, CZ_ORDER_SOURCE, type CzKind } from "@/lib/admin/cz-catalog";

/**
 * How many times each asset was used by the new customizer, read from the choices it stores as
 * line-item properties on the journal line (Cover, String, _Charm N, notebooks, _Patch, ...).
 * Read-only. Cancelled orders are ignored. Orders from the old customizer don't carry
 * `_source = sanaya-cz-v1` and are skipped.
 */
export interface CzUse {
  key: string;
  at: string; // order createdAt
}

const QUERY = `query($cursor: String, $q: String!) {
  orders(first: 50, after: $cursor, reverse: true, sortKey: CREATED_AT, query: $q) {
    pageInfo { hasNextPage endCursor }
    nodes {
      createdAt
      cancelledAt
      lineItems(first: 30) { nodes { product { id } customAttributes { key value } } }
    }
  }
}`;

interface Resp {
  orders: {
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
    nodes: {
      createdAt: string;
      cancelledAt: string | null;
      lineItems: { nodes: { product: { id: string } | null; customAttributes: { key: string; value: string }[] }[] };
    }[];
  };
}

const byMatch = (kind: CzKind) => new Map(CZ_ASSETS.filter((x) => x.kind === kind).map((x) => [x.match, x.key]));
const COVER = byMatch("cover"), STRING = byMatch("string"), NOTEBOOK = byMatch("notebook");
const PATCH = byMatch("patch"), CORNER = byMatch("corner"), PEN = byMatch("pen");
const CHARM = new Set(CZ_ASSETS.filter((x) => x.kind === "charm").map((x) => x.id));

function keysOf(attrs: Record<string, string>): string[] {
  const out: string[] = [];
  const push = (k: string | undefined) => k && out.push(k);
  push(COVER.get(attrs["Cover"]));
  push(STRING.get(attrs["String"]));
  for (const n of ["first notebook (1/3)", "second notebook (2/3)", "third notebook (3/3)"]) {
    push(NOTEBOOK.get(attrs[`_Choose your ${n}`]));
  }
  push(NOTEBOOK.get(attrs["_Extra Notebooks"]));
  push(PATCH.get(attrs["_Patch"]));
  push(CORNER.get(attrs["_Corner Protectors"]));
  push(PEN.get(attrs["_Pen Holder"]));
  for (let i = 1; i <= 11; i++) {
    const c = attrs[`_Charm ${i}`];
    if (c && CHARM.has(c)) out.push(`charm:${c}`);
  }
  return out;
}

/** Every use since `since` (ISO), newest orders first, capped so a huge history can't stall the page. */
export async function fetchCzUses(since: string | null): Promise<{ uses: CzUse[]; truncated: boolean }> {
  const q = [`product_id:${CZ_JOURNAL_PRODUCT_ID}`, since ? `created_at:>=${since}` : ""].filter(Boolean).join(" ");
  const uses: CzUse[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < 10; page++) {
    const data: Resp = await shopifyAdmin<Resp>(QUERY, { cursor, q });
    for (const o of data.orders.nodes) {
      if (o.cancelledAt) continue;
      for (const li of o.lineItems.nodes) {
        if (li.product?.id !== `gid://shopify/Product/${CZ_JOURNAL_PRODUCT_ID}`) continue;
        const attrs = Object.fromEntries(li.customAttributes.map((a) => [a.key, a.value]));
        if (attrs["_source"] !== CZ_ORDER_SOURCE) continue;
        for (const key of keysOf(attrs)) uses.push({ key, at: o.createdAt });
      }
    }
    if (!data.orders.pageInfo.hasNextPage) return { uses, truncated: false };
    cursor = data.orders.pageInfo.endCursor;
  }
  return { uses, truncated: true };
}
