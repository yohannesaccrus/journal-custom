"use client";

import Link from "next/link";
import { useState } from "react";

export interface NeedsAttentionRow {
  variantId: string;
  productTitle: string;
  variantTitle: string;
  imageUrl: string | null;
  inventoryQuantity: number;
}

const PAGE_SIZE = 5;

export function NeedsAttentionTable({ rows }: { rows: NeedsAttentionRow[] }) {
  const [page, setPage] = useState(0);
  const pageCount = Math.ceil(rows.length / PAGE_SIZE);
  const visible = rows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  return (
    <div>
      <div className="rounded-xl border border-white/70 bg-white/45 backdrop-blur-2xl ring-1 ring-inset ring-white/50 shadow-[0_8px_30px_-12px_rgba(15,61,52,0.15)] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gradient-to-r from-[#f2ece1] to-[#ece4d3] text-left text-xs text-[#6b6a63] uppercase tracking-wide">
              <th className="px-4 py-2.5 font-medium">Product</th>
              <th className="px-4 py-2.5 font-medium">Variant</th>
              <th className="px-4 py-2.5 font-medium">Stock</th>
              <th className="px-4 py-2.5 font-medium" />
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.variantId} className="border-t border-[#f0ece0]/80 hover:bg-white/60 transition-colors">
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#eae7de] bg-[#f7f5f0]">
                      {row.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={row.imageUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-[10px] text-[#c8c2b3]">—</span>
                      )}
                    </span>
                    {row.productTitle}
                  </div>
                </td>
                <td className="px-4 py-2.5 text-[#6b6a63]">{row.variantTitle}</td>
                <td className="px-4 py-2.5">
                  {row.inventoryQuantity <= 0 ? (
                    <span className="rounded-full bg-gradient-to-r from-[#c23f35] to-[#b5342c] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white shadow-sm">
                      Out of stock
                    </span>
                  ) : (
                    <span className="rounded-full bg-gradient-to-r from-[#f6dcbb] to-[#f0ce9f] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#8a4d1f]">
                      {row.inventoryQuantity} left
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <Link href="/admin/assets" className="text-xs font-medium text-[#0f3d34] hover:underline">
                    Manage
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <div className="mt-3 flex items-center justify-between text-xs text-[#6b6a63]">
          <span>
            Page {page + 1} of {pageCount} · {rows.length} items
          </span>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded-full border border-[#e7e2d4] bg-white/60 px-3 py-1 font-medium text-[#1c1c1a] transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={page === pageCount - 1}
              className="rounded-full border border-[#e7e2d4] bg-white/60 px-3 py-1 font-medium text-[#1c1c1a] transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
