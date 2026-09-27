"use client";

import { StockEditor } from "./StockEditor";
import { AddAssetForm } from "./AddAssetForm";

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
}
export interface CzAssetSection {
  kind: string;
  title: string;
  rows: CzAssetRow[];
  ids: string[];
}

const LOW = 5;

function Row({ row }: { row: CzAssetRow }) {
  const remaining = row.counted == null ? null : row.counted - row.used;
  const status =
    remaining == null ? { text: "Not counted", cls: "text-[#6b6a63]" }
    : remaining <= 0 ? { text: "Sold out", cls: "text-[#b5342c] font-medium" }
    : remaining <= LOW ? { text: "Low", cls: "text-[#b1632f] font-medium" }
    : { text: "OK", cls: "text-[#2f7a63]" };

  return (
    <tr className="border-t border-[#e6e0d2]">
      <td className="py-2 pr-3">
        <div className="flex items-center gap-2">
          {row.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={row.imageUrl} alt="" className="h-8 w-8 rounded object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
          )}
          <span>{row.label}</span>
        </div>
      </td>
      <td className="py-2 pr-3 tabular-nums">{row.counted ?? "—"}</td>
      <td className="py-2 pr-3 tabular-nums text-[#6b6a63]">{row.used}</td>
      <td className={`py-2 pr-3 tabular-nums ${remaining != null && remaining <= LOW ? "font-medium" : ""}`}>{remaining ?? "—"}</td>
      <td className={`py-2 pr-3 ${status.cls}`}>{status.text}</td>
      <td className="py-2">
        <StockEditor endpoint="/api/admin/cz-stock" target={{ key: row.key }} initial="" canAdjust={row.counted != null} setLabel="Set count" />
      </td>
    </tr>
  );
}

export function CzAssetStock({ sections }: { sections: CzAssetSection[] }) {
  return (
    <div className="space-y-4">
      {sections.map((s) => (
        <details key={s.kind} className="rounded-xl border border-white/70 bg-white/40 p-5 ring-1 ring-inset ring-white/50 backdrop-blur-3xl" open={s.rows.length <= 12}>
          <summary className="cursor-pointer font-medium">
            {s.title} <span className="text-xs font-normal text-[#6b6a63]">({s.rows.length})</span>
          </summary>
          <AddAssetForm kind={s.kind} existingIds={s.ids} />
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[#6b6a63]">
                <th className="py-1 font-normal">Asset</th>
                <th className="py-1 font-normal">Counted</th>
                <th className="py-1 font-normal">Used since</th>
                <th className="py-1 font-normal">Remaining</th>
                <th className="py-1 font-normal">Status</th>
                <th className="py-1 font-normal">Change stock</th>
              </tr>
            </thead>
            <tbody>
              {s.rows.map((r) => (
                <Row key={r.key} row={r} />
              ))}
            </tbody>
          </table>
        </details>
      ))}
    </div>
  );
}
