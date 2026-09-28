import Link from "next/link";
import { fetchCzStock, type CzPrice } from "@/lib/admin/cz-stock";
import { formatMoney } from "@/lib/markets";
import { loadAssets, msg } from "./data";
import { CZ_PAGES, czPageHref } from "./pages";
import { ShopPrice } from "./ShopPrice";
import { SectionHeading, Stat } from "./StockPage";
import { assetStatus } from "./status";
import { CARD, TD, TH } from "./styles";
import { Notice, Pill, type Tone } from "./ui";

export const dynamic = "force-dynamic";

/** Where a section lives: its page and anchor. */
function hrefOf(sectionId: string) {
  const page = CZ_PAGES.find((p) => (p.sections as readonly string[]).includes(sectionId));
  return page ? `${czPageHref(page.slug)}#${sectionId}` : czPageHref(CZ_PAGES[0].slug);
}

const TONE_ORDER: Record<Tone, number> = { out: 0, low: 1, muted: 2, ok: 3 };

/**
 * Customizer Stock overview: read-only. Totals, one card per sub-page, what needs restocking, and
 * every price in one place. All counting and editing happens on the sub-pages it links to.
 */
export default async function CustomizerStockOverview() {
  const [assets, products] = await Promise.all([loadAssets(), fetchCzStock().catch((err: unknown) => ({ error: msg(err) }))]);
  if ("error" in assets) {
    return (
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-8 font-serif text-3xl text-[#1c1c1a]">Customizer Stock</h1>
        <Notice tone="error">Couldn&apos;t load asset stock: {assets.error}</Notice>
      </div>
    );
  }

  const rows = assets.sections.flatMap((s) => s.rows.map((r) => ({ ...r, section: s, status: assetStatus(r.counted, r.used) })));
  const tally = (t: Tone) => rows.filter((r) => r.status.tone === t).length;
  const attention = rows
    .filter((r) => r.status.tone === "out" || r.status.tone === "low")
    .sort((a, b) => TONE_ORDER[a.status.tone] - TONE_ORDER[b.status.tone]);
  const productRows = "error" in products ? [] : products;
  const productAttention = productRows.flatMap((p) =>
    p.variants.filter((v) => v.tracked && v.inventoryQuantity <= 10).map((v) => ({ product: p, variant: v }))
  );

  // Every real price once: the pricing panels' fields, then the two Shopify products.
  const prices: { key: string; label: string; appliesTo: string; price: CzPrice | null; href: string; addOn?: boolean }[] = [];
  for (const s of assets.sections) {
    if (!("groups" in s.pricing)) continue;
    for (const g of s.pricing.groups) {
      if (!prices.some((p) => p.key === g.key)) {
        prices.push({ key: g.key, label: g.label, appliesTo: g.appliesTo, price: g.price, href: hrefOf(s.id), addOn: g.addOn });
      }
    }
  }
  for (const p of productRows) {
    const used = p.variants.find((v) => v.usedByCustomizer) ?? p.variants[0];
    if (used) prices.push({ key: p.key, label: p.label, appliesTo: "Charged per item added", price: used.price, href: `${czPageHref("contents")}#products` });
  }

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-8">
        <h1 className="font-serif text-3xl text-[#1c1c1a]">Customizer Stock</h1>
      </header>

      <div className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat hero label="Assets tracked" value={rows.length} hint={`${tally("ok")} in stock`} />
        <Stat label="Sold out" value={tally("out")} hint="Nothing left to sell" />
        <Stat label="Low" value={tally("low")} hint="5 or fewer left" />
        <Stat label="Not counted" value={tally("muted")} hint="No stock count yet" />
      </div>

      {assets.warning && (
        <div className="mb-6">
          <Notice tone="warning">{assets.warning}</Notice>
        </div>
      )}

      <section className="mb-12">
        <SectionHeading title="Categories">
          Each category has its own page for <strong>counting stock</strong>{" "}and <strong>editing prices</strong>.
        </SectionHeading>
        <div className="grid gap-4 md:grid-cols-3">
          {CZ_PAGES.map((page) => {
            const pr = rows.filter((r) => (page.sections as readonly string[]).includes(r.section.id));
            const n = (t: Tone) => pr.filter((r) => r.status.tone === t).length;
            const extra = page.withProducts ? productRows.length : 0;
            return (
              <Link
                key={page.slug}
                href={czPageHref(page.slug)}
                className={`${CARD} group flex flex-col p-5 transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-20px_rgba(10,43,37,0.5)]`}
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-serif text-lg text-[#1c1c1a]">{page.title}</h3>
                  <span className="text-[#b1632f] transition-transform group-hover:translate-x-0.5">→</span>
                </div>
                <p className="mt-1 text-xs text-[#6b6a63]">
                  {page.sections.map((id) => assets.sections.find((s) => s.id === id)?.title).join(" · ")}
                  {extra > 0 && " · Pocket & extra notebook"}
                </p>
                <p className="mt-auto pt-4 font-serif text-3xl tabular-nums text-[#0f3d34]">
                  {pr.length + extra}
                  <span className="ml-1.5 font-sans text-xs text-[#6b6a63]">items</span>
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {n("out") > 0 && <Pill tone="out">{n("out")} sold out</Pill>}
                  {n("low") > 0 && <Pill tone="low">{n("low")} low</Pill>}
                  {n("muted") > 0 && <Pill tone="muted">{n("muted")} not counted</Pill>}
                  {n("ok") > 0 && <Pill tone="ok">{n("ok")} in stock</Pill>}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mb-12">
        <SectionHeading title="Needs attention">
          Assets that are <strong>sold out</strong>{" "}or <strong>low</strong>{" "}(5 or fewer left), and tracked Shopify products
          with 10 or fewer. Click one to restock it on its page.
        </SectionHeading>
        {attention.length === 0 && productAttention.length === 0 ? (
          <div className={`${CARD} flex flex-wrap items-center gap-3 px-5 py-4 text-sm text-[#3d3c37]`}>
            <Pill tone="ok">All clear</Pill>
            {tally("muted") > 0
              ? `Nothing counted is running low. ${tally("muted")} assets have no count yet, so they can't be checked.`
              : "Nothing is sold out or running low."}
          </div>
        ) : (
          <div className={`${CARD} overflow-x-auto`}>
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="bg-[#0f3d34]/[0.035]">
                  <th className={`${TH} pl-5`}>Asset</th>
                  <th className={TH}>Category</th>
                  <th className={TH}>Remaining</th>
                  <th className={TH}>Status</th>
                  <th className={`${TH} pr-5`} />
                </tr>
              </thead>
              <tbody>
                {attention.map((r) => (
                  <tr key={r.key} className="border-t border-[#e6e0d2]/80 transition-colors hover:bg-white/60">
                    <td className={`${TD} pl-5 font-medium`}>{r.label}</td>
                    <td className={`${TD} text-[#6b6a63]`}>{r.section.title}</td>
                    <td className={`${TD} font-medium tabular-nums`}>{r.status.remaining}</td>
                    <td className={TD}>
                      <Pill tone={r.status.tone}>{r.status.text}</Pill>
                    </td>
                    <td className={`${TD} pr-5 text-right`}>
                      <Link href={hrefOf(r.section.id)} className="text-xs font-medium text-[#0f3d34] hover:underline">
                        Restock →
                      </Link>
                    </td>
                  </tr>
                ))}
                {productAttention.map(({ product, variant }) => (
                  <tr key={variant.id} className="border-t border-[#e6e0d2]/80 transition-colors hover:bg-white/60">
                    <td className={`${TD} pl-5 font-medium`}>{product.label}</td>
                    <td className={`${TD} text-[#6b6a63]`}>Shopify product</td>
                    <td className={`${TD} font-medium tabular-nums`}>{variant.inventoryQuantity}</td>
                    <td className={TD}>
                      <Pill tone={variant.inventoryQuantity <= 0 ? "out" : "low"}>{variant.inventoryQuantity <= 0 ? "Sold out" : "Low"}</Pill>
                    </td>
                    <td className={`${TD} pr-5 text-right`}>
                      <Link href={`${czPageHref("contents")}#products`} className="text-xs font-medium text-[#0f3d34] hover:underline">
                        Restock →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <SectionHeading title="Prices">
          Every price the customizer charges, in the market picked at the top right. <strong>One price per row</strong>: each
          is a single Shopify product shared by every asset listed. Edit it on its page.
        </SectionHeading>
        <div className={`${CARD} overflow-x-auto`}>
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="bg-[#0f3d34]/[0.035]">
                <th className={`${TH} pl-5`}>Price</th>
                <th className={TH}>Applies to</th>
                <th className={TH}>Selected market</th>
                <th className={TH}>Indonesia</th>
                <th className={`${TH} pr-5`} />
              </tr>
            </thead>
            <tbody>
              {prices.map((p) => (
                <tr key={p.key} className="border-t border-[#e6e0d2]/80 transition-colors hover:bg-white/60">
                  <td className={`${TD} pl-5 font-medium`}>{p.label}</td>
                  <td className={`${TD} max-w-sm text-xs text-[#6b6a63]`}>{p.appliesTo}</td>
                  <td className={`${TD} font-serif text-base tabular-nums text-[#0f3d34]`}>
                    {p.price ? (
                      <>
                        {p.addOn && <span className="text-[#b1632f]">+ </span>}
                        <ShopPrice price={p.price} />
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className={`${TD} tabular-nums text-[#6b6a63]`}>{p.price?.idr != null ? formatMoney(p.price.idr, "IDR") : "—"}</td>
                  <td className={`${TD} pr-5 text-right`}>
                    <Link href={p.href} className="text-xs font-medium text-[#0f3d34] hover:underline">
                      Edit →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {"error" in products && <p className="mt-2 text-xs text-[#9a2a23]">Couldn&apos;t load the pocket and extra notebook: {products.error}</p>}
      </section>
    </div>
  );
}
