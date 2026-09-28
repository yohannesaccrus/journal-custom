import type { ReactNode } from "react";
import { fetchCzStock } from "@/lib/admin/cz-stock";
import { findIdrPriceList } from "@/lib/admin/cz-price";
import { CzAssetStock } from "./CzAssetStock";
import { loadAssets, msg, type CzSectionId } from "./data";
import { StockEditor } from "./StockEditor";
import { PriceSetupNotice } from "./PriceEditor";
import { PriceTile } from "./PricingPanel";
import { ShopPrice } from "./ShopPrice";
import { assetStatus } from "./status";
import { CARD, TD, TH } from "./styles";
import { Notice, Pill, Toaster } from "./ui";

const LOW_STOCK_THRESHOLD = 10;

/** Why the asset counts on these pages are ours, not Shopify's. Shown on every page with asset tables. */
export const ASSETS_INTRO = (
  <>
    These are <strong>not Shopify products</strong>, so Shopify keeps no stock for them. <strong>This page does.</strong>{" "}
    Enter the <strong>physical count</strong>{" "}you have on hand with Set count; every order placed after that is{" "}
    <strong>subtracted automatically</strong>{" "}to give what&apos;s remaining. Note: the storefront{" "}
    <strong>won&apos;t hide a sold-out asset yet</strong>, which needs the theme to read this stock.
  </>
);

/**
 * One Customizer Stock page: summary cards, then the asked-for asset sections (each with its
 * pricing panel and table), then optionally the organizer pocket and extra notebook, which are
 * real Shopify products.
 */
export async function StockPage({
  title,
  sections: wanted,
  intro = ASSETS_INTRO,
  withProducts = false,
}: {
  title: string;
  sections: CzSectionId[];
  intro?: ReactNode;
  withProducts?: boolean;
}) {
  const [assets, rows, priceList] = await Promise.all([
    loadAssets(),
    withProducts ? fetchCzStock().catch((err: unknown) => ({ error: msg(err) })) : Promise.resolve(null),
    findIdrPriceList().catch((err: unknown) =>
      /read_markets/.test(msg(err)) ? { error: "the app needs the read_markets and write_markets scopes in Shopify." } : { error: msg(err) }
    ),
  ]);
  const pricesEditable = typeof priceList === "string";
  const sections = "error" in assets ? [] : wanted.flatMap((id) => assets.sections.filter((s) => s.id === id));

  const all = sections.flatMap((s) => s.rows.map((r) => assetStatus(r.counted, r.used).tone));
  const tally = (t: string) => all.filter((x) => x === t).length;

  return (
    <div className="mx-auto max-w-7xl">
      <Toaster />
      <header className="mb-8 flex flex-wrap items-end gap-x-4 gap-y-2">
        <h1 className="font-serif text-3xl text-[#1c1c1a]">{title}</h1>
        {sections.length > 1 && (
          <nav className="flex flex-wrap gap-1.5 pb-1" aria-label="Jump to section">
            {[...sections.map((s) => ({ id: s.id, title: s.title })), ...(withProducts ? [{ id: "products", title: "Pocket & extra notebook" }] : [])].map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="rounded-full border border-[#0f3d34]/15 bg-white/60 px-3 py-1 text-xs font-medium text-[#0f3d34] transition-colors hover:border-[#0f3d34]/40 hover:bg-white"
              >
                {s.title}
              </a>
            ))}
          </nav>
        )}
      </header>

      {!("error" in assets) && (
        <div className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat hero label="Assets tracked" value={all.length} hint={`${tally("ok")} in stock`} />
          <Stat label="Sold out" value={tally("out")} hint="Nothing left to sell" />
          <Stat label="Low" value={tally("low")} hint="5 or fewer left" />
          <Stat label="Not counted" value={tally("muted")} hint="No stock count yet" />
        </div>
      )}

      <section>
        <SectionHeading title="Assets">{intro}</SectionHeading>
        <div className="space-y-3">
          {!pricesEditable && <PriceSetupNotice problem={priceList === null ? "missing" : priceList.error} />}
          {"error" in assets ? (
            <Notice tone="error">Couldn&apos;t load asset stock: {assets.error}</Notice>
          ) : (
            <>
              {assets.warning && <Notice tone="warning">{assets.warning}</Notice>}
              <CzAssetStock sections={sections} pricesEditable={pricesEditable} />
            </>
          )}
        </div>
      </section>

      {rows && (
        <section id="products" className="mt-12 scroll-mt-6">
          <SectionHeading title="Organizer pocket & extra notebook">
            These two <strong>are real Shopify products</strong>, so stock changes here{" "}
            <strong>update Shopify inventory directly</strong>. Once a count is set, the storefront shows them as sold out at 0.
          </SectionHeading>
          {"error" in rows ? (
            <Notice tone="error">Couldn&apos;t load stock from Shopify: {rows.error}</Notice>
          ) : (
            <div className="grid gap-4">
              {rows.map((row) => (
                <div key={row.key} className={`${CARD} overflow-hidden`}>
                  <div className="flex flex-wrap items-center gap-4 px-5 py-4">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-[#efe9dc] to-[#e6dfcf] ring-1 ring-black/5">
                      {row.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={row.imageUrl} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-serif text-lg text-[#1c1c1a]">{row.label}</h3>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-[#6b6a63]">
                        {row.found ? (
                          <>
                            <span>{row.title}</span>
                            <span className="rounded-full bg-[#0f3d34]/[0.07] px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-[#0f3d34]">
                              {row.status?.toLowerCase()}
                            </span>
                          </>
                        ) : (
                          <span className="text-[#9a2a23]">Product not found in Shopify</span>
                        )}
                        <span className="tabular-nums text-[#a8a498]">#{row.productId}</span>
                      </p>
                    </div>
                    {row.found && (() => {
                      const used = row.variants.find((v) => v.usedByCustomizer) ?? row.variants[0];
                      return (
                        used && (
                          <div className="w-full overflow-hidden rounded-xl ring-1 ring-[#0f3d34]/15 sm:w-64">
                            <PriceTile
                              enabled={pricesEditable}
                              group={{
                                key: row.key,
                                label: "Price",
                                appliesTo: "Charged once per item added in the customizer. The table below is a preview.",
                                scope: `the ${row.label.toLowerCase()} price`,
                                price: used.price,
                              }}
                            />
                          </div>
                        )
                      );
                    })()}
                  </div>

                  {row.found && (
                    <div className="overflow-x-auto border-t border-[#e6e0d2]/80">
                      <table className="w-full min-w-[880px] text-sm">
                        <thead>
                          <tr className="bg-[#0f3d34]/[0.035]">
                            <th className={`${TH} pl-5`}>Variant</th>
                            <th className={TH}>Price</th>
                            <th className={TH}>Stock</th>
                            <th className={TH}>Storefront</th>
                            <th className={TH}>Used by customizer</th>
                            <th className={`${TH} pr-5`}>Change stock</th>
                          </tr>
                        </thead>
                        <tbody>
                          {row.variants.map((v) => {
                            const low = v.tracked && v.inventoryQuantity <= LOW_STOCK_THRESHOLD;
                            return (
                              <tr key={v.id} className="border-t border-[#e6e0d2]/80 transition-colors hover:bg-white/60">
                                <td className={`${TD} pl-5 font-medium`}>{v.title}</td>
                                <td className={`${TD} tabular-nums`}>
                                  <ShopPrice price={v.price} />
                                </td>
                                <td className={`${TD} font-medium tabular-nums ${low ? "text-[#9a2a23]" : ""}`}>
                                  {v.tracked ? v.inventoryQuantity : <span className="font-normal text-[#6b6a63]">Not tracked</span>}
                                </td>
                                <td className={TD}>
                                  <Pill tone={v.available ? "ok" : "out"}>{v.available ? "Available" : "Sold out"}</Pill>
                                </td>
                                <td className={`${TD} text-[#6b6a63]`}>{v.usedByCustomizer ? "Yes" : <span className="text-[#b9b4a6]">—</span>}</td>
                                <td className={`${TD} pr-5`}>
                                  <StockEditor
                                    endpoint="/api/admin/cz-stock/product"
                                    target={{ inventoryItemId: v.inventoryItemId }}
                                    initial=""
                                    canAdjust={v.tracked}
                                    setLabel={v.tracked ? "Set" : "Track & set"}
                                    confirmSet={
                                      v.tracked
                                        ? undefined
                                        : "This variant isn't tracked yet. Setting a count turns on Track quantity in Shopify, so it becomes Sold out at 0."
                                    }
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export function Stat({ label, value, hint, hero = false }: { label: string; value: number; hint: string; hero?: boolean }) {
  return hero ? (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#154a3f] via-[#0f3d34] to-[#0a2b25] p-5 text-white shadow-[0_18px_40px_-20px_rgba(10,43,37,0.8)]">
      <div className="pointer-events-none absolute -top-10 -right-8 h-32 w-32 rounded-full bg-[#b1632f]/35 blur-[50px]" />
      <div className="pointer-events-none absolute -bottom-12 left-6 h-28 w-28 rounded-full bg-white/10 blur-[50px]" />
      <p className="relative text-[11px] font-semibold uppercase tracking-wider text-[#e0a870]">{label}</p>
      <p className="relative mt-2 font-serif text-4xl tabular-nums text-[#f2ece1]">{value}</p>
      <p className="relative mt-1 text-xs text-[#f2ece1]/60">{hint}</p>
    </div>
  ) : (
    <div className={`${CARD} p-5`}>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6b6a63]">{label}</p>
      <p className="mt-2 font-serif text-4xl tabular-nums text-[#1c1c1a]">{value}</p>
      <p className="mt-1 text-xs text-[#6b6a63]">{hint}</p>
    </div>
  );
}

export function SectionHeading({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-3">
        <span className="h-5 w-1 rounded-full bg-gradient-to-b from-[#e0a870] to-[#b1632f]" />
        <h2 className="font-serif text-xl text-[#1c1c1a]">{title}</h2>
      </div>
      <p className="mt-1.5 pl-4 text-sm leading-relaxed text-[#6b6a63] [&_strong]:font-semibold [&_strong]:text-[#1c1c1a]">{children}</p>
    </div>
  );
}

