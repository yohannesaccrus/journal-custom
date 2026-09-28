import "server-only";
import { fetchCzPrices, type CzMoney, type CzPrice, type CzPriceKey } from "@/lib/admin/cz-stock";
import { CZ_MARKETS } from "@/lib/markets";
import { CZ_KIND_LABEL, CZ_KIND_ORDER, type CzAsset, type CzKind } from "@/lib/admin/cz-catalog";
import { readAllAssets } from "@/lib/admin/cz-catalog-store";
import { readCzLedger } from "@/lib/admin/cz-ledger";
import { fetchCzUses } from "@/lib/admin/cz-usage";
import type { CzAssetSection } from "./CzAssetStock";
import type { CzPriceGroup, CzPricing } from "./PricingPanel";

export const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Two products bought together (journal + animal upgrade): each market pays both of its own prices. */
function sumPrices(a: CzPrice, b: CzPrice): CzPrice {
  const add = (x: CzMoney | undefined, y: CzMoney | undefined) =>
    x && y && x.currency === y.currency ? { amount: Math.round((x.amount + y.amount) * 100) / 100, currency: x.currency } : undefined;
  const markets: CzPrice["markets"] = {};
  for (const { country } of CZ_MARKETS) {
    const m = add(a.markets[country], b.markets[country]);
    if (m) markets[country] = m;
  }
  return { base: add(a.base, b.base)!, markets, idr: a.idr != null && b.idr != null ? a.idr + b.idr : null };
}

const SIZES = ["S", "M", "L"] as const;
type Size = (typeof SIZES)[number];
const charmSize = (a: CzAsset): Size | null => {
  const s = a.group?.slice(-1);
  return s === "S" || s === "M" || s === "L" ? s : null;
};
const isAnimal = (a: CzAsset) => a.group === "Animal print";

/**
 * Read-only preview of what choosing this asset costs, shown in its table row. A cover IS the
 * journal (animal prints add the upgrade); strings, patches and the 3 notebooks come with it.
 */
function previewOf(a: CzAsset, prices: Partial<Record<CzPriceKey, CzPrice>>): { price: CzPrice | null; priceNote: string | null } {
  const p = (k: CzPriceKey) => prices[k] ?? null;
  switch (a.kind) {
    case "cover": {
      const journal = p("journal");
      if (!isAnimal(a)) return { price: journal, priceNote: "Classic leather" };
      const animal = p("animal");
      return { price: journal && animal ? sumPrices(journal, animal) : null, priceNote: "Classic + animal upgrade" };
    }
    case "charm": {
      const size = charmSize(a);
      return { price: size ? p(`charm${size}`) : null, priceNote: size ? `Size ${size} price` : "No size set" };
    }
    case "corner":
    case "pen":
      return { price: p(a.kind), priceNote: null };
    default:
      return { price: null, priceNote: "Included" };
  }
}

const why = (items: string) =>
  `The customizer adds the same Shopify product to the cart whichever ${items} is picked, so one price applies to the whole group. Edit it here; the Price column below is a preview.`;

/**
 * A section's real prices: one per Shopify product the customizer puts in the cart. Every asset
 * of a group adds that same product (the choice itself is only a note on the order line), which is
 * why one price covers them all.
 */
function pricingOf(kind: CzKind, size: Size | null, assets: CzAsset[], prices: Partial<Record<CzPriceKey, CzPrice>>): CzPricing {
  const names = (xs: CzAsset[]) => xs.map((x) => x.label).join(", ");
  const group = (key: CzPriceKey, label: string, appliesTo: string, scope: string, addOn = false): CzPriceGroup => ({
    key,
    label,
    appliesTo,
    scope,
    price: prices[key] ?? null,
    addOn,
  });
  switch (kind) {
    case "cover": {
      const classic = assets.filter((a) => !isAnimal(a));
      const animal = assets.filter(isAnimal);
      return {
        note: `${why("cover")} An animal print costs the classic price plus the upgrade.`,
        groups: [
          group("journal", "Classic leather", names(classic), "every classic cover, and the base of every animal print"),
          group("animal", "Animal print upgrade", `Added on top for ${names(animal)}`, "every animal print", true),
        ],
      };
    }
    case "charm": {
      if (!size) return { included: "These charms have no size, so they can't be priced. Add them again with a size." };
      const ids = assets.map((a) => a.label.replace("Charm ", "#"));
      const range = ids.length ? `${ids.length} charms (${ids[0]}–${ids[ids.length - 1]})` : "No charms yet";
      return { note: why(`size ${size} charm`), groups: [group(`charm${size}`, `Size ${size} charm`, range, `every size ${size} charm`)] };
    }
    case "corner":
      return { note: why("colour"), groups: [group("corner", "Metal corners", names(assets), "both corner colours")] };
    case "pen":
      return { note: why("colour"), groups: [group("pen", "Pen holder", names(assets), "both pen holder colours")] };
    case "string":
      return { included: "Strings come with the journal at no extra charge." };
    case "patch":
      return { included: "Patches come with the journal at no extra charge." };
    default:
      return { included: "The 3 notebooks inside come with the journal. Extra notebooks are priced below." };
  }
}

/**
 * Section ids a page can ask for: each kind is one section, except charms, which get one section
 * per size ("charm-S", "charm-M", "charm-L") because each size has its own price.
 */
export type CzSectionId = Exclude<CzKind, "charm"> | `charm-${Size}`;

/** Every asset section with its stock (count, what orders used since) and prices. */
export async function loadAssets(): Promise<{ sections: CzAssetSection[]; warning: string | null } | { error: string }> {
  let ledger, allAssets, prices;
  try {
    [ledger, allAssets, prices] = await Promise.all([readCzLedger(), readAllAssets(), fetchCzPrices()]);
  } catch (e) {
    return { error: msg(e) };
  }
  // Orders are counted from the oldest recount on record; before any recount, from the last 90 days just to show activity.
  const oldest = Object.values(ledger).map((x) => x.asOf).sort()[0] ?? new Date(Date.now() - 90 * 864e5).toISOString();
  let uses: { key: string; at: string }[] = [];
  let warning: string | null = null;
  try {
    const r = await fetchCzUses(oldest);
    uses = r.uses;
    if (r.truncated) warning = "Order history was cut off at 500 orders; usage may be understated.";
  } catch (e) {
    warning = `Couldn't read orders, so "Used since" shows 0: ${msg(e)}`;
  }
  const imageBase = "https://sanayajewelry.com/cdn/shop/t/15/assets/";

  const section = (id: CzSectionId, kind: CzKind, title: string, assets: CzAsset[], size: Size | null = null): CzAssetSection => ({
    id,
    kind,
    title,
    group: size ? `Size ${size}` : null,
    rows: assets.map((a) => {
      const entry = ledger[a.key];
      const since = entry?.asOf ?? oldest;
      return {
        key: a.key,
        label: a.label,
        group: a.group ?? null,
        imageUrl: a.localImage ?? (a.image ? `${imageBase}${a.image}?width=80` : null),
        counted: entry?.qty ?? null,
        asOf: entry?.asOf ?? null,
        used: uses.filter((u) => u.key === a.key && u.at > since).length,
        ...previewOf(a, prices),
      };
    }),
    pricing: pricingOf(kind, size, assets, prices),
    ids: allAssets.filter((a) => a.kind === kind).map((a) => a.id),
  });

  const sections = CZ_KIND_ORDER.flatMap((kind) => {
    const ofKind = allAssets.filter((a) => a.kind === kind);
    if (kind !== "charm") return [section(kind, kind, CZ_KIND_LABEL[kind], ofKind)];
    return SIZES.map((s) => section(`charm-${s}`, kind, `Size ${s} charms`, ofKind.filter((a) => charmSize(a) === s), s));
  });
  return { sections, warning };
}
