"use client";

import { useEffect } from "react";

import { StockEditor } from "./StockEditor";
import { AssetActions, AddAssetButton, type CzAssetFormConfig, type CzAssetValues } from "./AssetDialog";
import { PricingPanel, type CzPricing } from "./PricingPanel";
import { ShopPrice } from "./ShopPrice";
import { assetStatus } from "./status";
import { ChangeStockHelp, Pill } from "./ui";
import { CARD, TD, TH } from "./styles";
import type { CzPrice } from "@/lib/admin/cz-stock";

export interface CzAssetRow {
  key: string;
  label: string;
  group: string | null;
  imageUrl: string | null;
  /** Recount on record, or null when never counted. */
  counted: number | null;
  asOf: string | null;
  /** Times used by orders since `asOf` (or in the loaded window when never counted). */
  used: number;
  /** Read-only preview of what the customer pays for choosing it; null when included or unreadable. */
  price: CzPrice | null;
  /** Which price group it comes from, e.g. "Size S price". */
  priceNote: string | null;
  /** Its current values when it was added from the admin (so it can be edited or deleted); null for built-in ones. */
  edit: CzAssetValues | null;
}
export interface CzAssetSection {
  /** Unique per section: the kind, or "charm-S" / "charm-M" / "charm-L" for charms split by size. */
  id: string;
  kind: string;
  title: string;
  /** Group given to assets added from this section (e.g. "Size S"), so they land back in it. */
  group: string | null;
  rows: CzAssetRow[];
  ids: string[];
  /** The category's editable prices, shown above its table. */
  pricing: CzPricing;
  /** How new assets are added to this section. */
  form: CzAssetFormConfig;
}

function Row({ row, form }: { row: CzAssetRow; form: CzAssetFormConfig }) {
  const s = assetStatus(row.counted, row.used);
  return (
    <tr className="border-t border-[#e6e0d2]/80 transition-colors hover:bg-white/60">
      <td className={`${TD} pl-5`}>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-[#efe9dc] to-[#e6dfcf] ring-1 ring-black/5">
            {row.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={row.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
            )}
          </div>
          <div className="min-w-0">
            <span className="font-medium text-[#1c1c1a]">{row.label}</span>
            {row.edit && <AssetActions form={form} assetKey={row.key} values={row.edit} />}
          </div>
        </div>
      </td>
      <td className={`${TD} tabular-nums`}>
        {row.price != null ? <span className="text-[#3d3c37]"><ShopPrice price={row.price} /></span> : <span className="text-[#b9b4a6]">—</span>}
        {row.priceNote && <span className="mt-0.5 block text-[11px] text-[#8a877c]">{row.priceNote}</span>}
      </td>
      <td className={`${TD} tabular-nums`}>{row.counted ?? <span className="text-[#b9b4a6]">—</span>}</td>
      <td className={`${TD} tabular-nums text-[#6b6a63]`}>{row.used}</td>
      <td className={`${TD} font-medium tabular-nums ${s.tone === "out" ? "text-[#9a2a23]" : s.tone === "low" ? "text-[#8a4a22]" : ""}`}>
        {s.remaining ?? <span className="font-normal text-[#b9b4a6]">—</span>}
      </td>
      <td className={TD}>
        <Pill tone={s.tone}>{s.text}</Pill>
      </td>
      <td className={`${TD} pr-5`}>
        <StockEditor endpoint="/api/admin/cz-stock" target={{ key: row.key }} initial="" canAdjust={row.counted != null} setLabel="Set count" />
      </td>
    </tr>
  );
}

function SectionSummary({ rows }: { rows: CzAssetRow[] }) {
  const counts = { out: 0, low: 0, muted: 0 };
  for (const r of rows) {
    const t = assetStatus(r.counted, r.used).tone;
    if (t !== "ok") counts[t]++;
  }
  return (
    <span className="flex flex-wrap justify-end gap-1.5">
      {counts.out > 0 && <Pill tone="out">{counts.out} sold out</Pill>}
      {counts.low > 0 && <Pill tone="low">{counts.low} low</Pill>}
      {counts.muted > 0 && <Pill tone="muted">{counts.muted} not counted</Pill>}
      {!counts.out && !counts.low && !counts.muted && <Pill tone="ok">All in stock</Pill>}
    </span>
  );
}

export function CzAssetStock({ sections, pricesEditable, open }: { sections: CzAssetSection[]; pricesEditable: boolean; open?: string[] }) {
  // A jump link (#charm-M) to a closed section opens it, on load and on later clicks.
  useEffect(() => {
    const openTarget = () => {
      const el = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (el instanceof HTMLDetailsElement && !el.open) {
        el.open = true;
        el.scrollIntoView({ block: "start" });
      }
    };
    openTarget();
    window.addEventListener("hashchange", openTarget);
    return () => window.removeEventListener("hashchange", openTarget);
  }, []);

  return (
    <div className="space-y-4">
      {sections.map((s) => (
        <details key={s.id} id={s.id} className={`group/section scroll-mt-6 overflow-hidden ${CARD}`} open={!open || open.includes(s.id)}>
          <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 px-5 py-4 transition-colors hover:bg-white/40 [&::-webkit-details-marker]:hidden">
            <svg className="h-4 w-4 shrink-0 text-[#b1632f] transition-transform duration-200 group-open/section:rotate-90" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
            </svg>
            <span className="font-serif text-lg text-[#1c1c1a]">{s.title}</span>
            <span className="rounded-full bg-[#0f3d34]/[0.07] px-2 py-0.5 text-[11px] font-medium tabular-nums text-[#0f3d34]">{s.rows.length}</span>
            <span className="ml-auto">
              <SectionSummary rows={s.rows} />
            </span>
          </summary>
          <div className="border-t border-[#e6e0d2]/80">
            <PricingPanel pricing={s.pricing} enabled={pricesEditable} />
            <div className="px-5 pt-3">
              <AddAssetButton form={s.form} existingIds={s.ids} />
            </div>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[880px] text-sm">
                <thead>
                  <tr className="bg-[#0f3d34]/[0.035]">
                    <th className={`${TH} pl-5`}>Asset</th>
                    <th className={TH} title="Preview. Prices are edited in the Pricing panel above.">
                      Price <span className="font-normal normal-case tracking-normal text-[#a8a498]">· preview</span>
                    </th>
                    <th className={TH}>Counted</th>
                    <th className={TH}>Used since</th>
                    <th className={TH}>Remaining</th>
                    <th className={TH}>Status</th>
                    <th className={`${TH} pr-5`}>
                      Change stock
                      <ChangeStockHelp kind="asset" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {s.rows.map((r) => (
                    <Row key={r.key} row={r} form={s.form} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </details>
      ))}
    </div>
  );
}
