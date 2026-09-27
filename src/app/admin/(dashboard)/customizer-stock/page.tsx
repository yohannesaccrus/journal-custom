import { fetchCzStock } from "@/lib/admin/cz-stock";
import { CZ_KIND_LABEL, CZ_KIND_ORDER } from "@/lib/admin/cz-catalog";
import { readAllAssets } from "@/lib/admin/cz-catalog-store";
import { readCzLedger } from "@/lib/admin/cz-ledger";
import { fetchCzUses } from "@/lib/admin/cz-usage";
import { CzAssetStock, type CzAssetSection } from "./CzAssetStock";
import { StockEditor } from "./StockEditor";

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

async function loadAssets(): Promise<{ sections: CzAssetSection[]; warning: string | null } | { error: string }> {
  let ledger, allAssets;
  try {
    [ledger, allAssets] = await Promise.all([readCzLedger(), readAllAssets()]);
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
  const sections = CZ_KIND_ORDER.map((kind) => ({
    kind,
    title: CZ_KIND_LABEL[kind],
    rows: allAssets.filter((a) => a.kind === kind).map((a) => {
      const entry = ledger[a.key];
      const since = entry?.asOf ?? oldest;
      return {
        key: a.key,
        label: a.group && (kind === "charm") ? `${a.label} · ${a.group}` : a.label,
        group: a.group ?? null,
        imageUrl: a.image ? `${imageBase}${a.image}?width=80` : null,
        counted: entry?.qty ?? null,
        asOf: entry?.asOf ?? null,
        used: uses.filter((u) => u.key === a.key && u.at > since).length,
      };
    }),
    ids: allAssets.filter((a) => a.kind === kind).map((a) => a.id),
  }));
  return { sections, warning };
}

const LOW_STOCK_THRESHOLD = 10;

export const dynamic = "force-dynamic";

export default async function CustomizerStockPage() {
  const assets = await loadAssets();
  const rows = await fetchCzStock().catch((err: unknown) => ({ error: err instanceof Error ? err.message : String(err) }));

  return (
    <div>
      <h1 className="text-2xl font-serif">Customizer Stock</h1>
      <p className="mt-1 text-sm text-[#6b6a63]">
        Stock for everything the new customizer offers: every cover, string, charm, patch, notebook, corner and
        pen holder colour, plus the organizer pocket and extra notebook. Add, remove or set the count on each row.
      </p>

      <h2 className="mt-8 text-lg font-serif">Assets</h2>
      <p className="mt-1 text-sm text-[#6b6a63]">
        These are not Shopify products, so they have no inventory there. Set a physical count; what orders use
        afterwards is read from the orders (read-only) and subtracted. This is for tracking: the storefront will
        not hide an asset that runs out until its theme reads this data.
      </p>
      {"error" in assets ? (
        <p className="mt-4 rounded-lg border border-[#b5342c]/30 bg-[#b5342c]/5 p-4 text-sm text-[#b5342c]">
          Couldn&apos;t load asset stock: {assets.error}
        </p>
      ) : (
        <div className="mt-4">
          {assets.warning && <p className="mb-3 text-xs text-[#b1632f]">{assets.warning}</p>}
          <CzAssetStock sections={assets.sections} />
        </div>
      )}

      <h2 className="mt-10 text-lg font-serif">Organizer pocket &amp; extra notebook</h2>
      <p className="mt-1 text-sm text-[#6b6a63]">
        These two are real Shopify products, so changes here update Shopify inventory directly.
      </p>
      {"error" in rows ? (
        <p className="mt-6 rounded-lg border border-[#b5342c]/30 bg-[#b5342c]/5 p-4 text-sm text-[#b5342c]">
          Couldn&apos;t load stock from Shopify: {rows.error}
        </p>
      ) : (
        <div className="mt-6 space-y-4">
          {rows.map((row) => (
            <section
              key={row.key}
              className="rounded-xl border border-white/70 bg-white/40 p-5 ring-1 ring-inset ring-white/50 backdrop-blur-3xl"
            >
              <div className="flex items-start gap-4">
                {row.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={row.imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                ) : (
                  <div className="h-14 w-14 shrink-0 rounded-lg bg-[#efe9dc]" />
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="font-medium">{row.label}</h2>
                  <p className="text-xs text-[#6b6a63]">
                    {row.found ? `${row.title} · ${row.status?.toLowerCase()}` : "Product not found in Shopify"}
                    {" · "}
                    <span className="tabular-nums">#{row.productId}</span>
                  </p>
                </div>
              </div>

              {row.found && (
                <table className="mt-4 w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-[#6b6a63]">
                      <th className="py-1 font-normal">Variant</th>
                      <th className="py-1 font-normal">Stock</th>
                      <th className="py-1 font-normal">Storefront</th>
                      <th className="py-1 font-normal">Used by customizer</th>
                      <th className="py-1 font-normal">Change stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {row.variants.map((v) => {
                      const low = v.tracked && v.inventoryQuantity <= LOW_STOCK_THRESHOLD;
                      return (
                        <tr key={v.id} className="border-t border-[#e6e0d2]">
                          <td className="py-2">{v.title}</td>
                          <td className={`py-2 tabular-nums ${low ? "font-medium text-[#b5342c]" : ""}`}>
                            {v.tracked ? v.inventoryQuantity : "Not tracked"}
                          </td>
                          <td className="py-2">
                            <span className={v.available ? "text-[#2f7a63]" : "text-[#b5342c]"}>
                              {v.available ? "Available" : "Sold out"}
                            </span>
                          </td>
                          <td className="py-2 text-[#6b6a63]">{v.usedByCustomizer ? "Yes" : ""}</td>
                          <td className="py-2">
                            <StockEditor
                              endpoint="/api/admin/cz-stock/product"
                              target={{ inventoryItemId: v.inventoryItemId }}
                              initial=""
                              canAdjust={v.tracked}
                              setLabel={v.tracked ? "Set" : "Track & set"}
                              confirmSet={v.tracked ? undefined : "This variant isn't tracked yet. Setting a count turns on Track quantity in Shopify, so it becomes Sold out at 0. Continue?"}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
