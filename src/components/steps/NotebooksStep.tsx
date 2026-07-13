"use client";

import { buildNotebookEntries, NOTEBOOK_SPEC_NOTE, NOTEBOOKS_PER_JOURNAL, notebookCount } from "@/lib/catalog";
import { NotebookIcon } from "@/components/NotebookIcon";
import type { ShopifyJournalProduct } from "@/lib/shopify-admin";

interface NotebooksStepProps {
  notebookProduct: ShopifyJournalProduct;
  notebooks: Record<string, number>;
  onChange: (notebooks: Record<string, number>) => void;
}

const DESCRIPTIONS: Record<string, string> = {
  "To-Do List": "Checklists & daily tasks",
  "Lined Notebook": "Writing & journaling",
  "Blank Notebook": "Sketching & freeform",
  "Grid Notebook": "Bullet journaling",
};

export function NotebooksStep({ notebookProduct, notebooks, onChange }: NotebooksStepProps) {
  const entries = buildNotebookEntries(notebookProduct);
  const total = notebookCount(notebooks);
  const remaining = NOTEBOOKS_PER_JOURNAL - total;

  function setCount(design: string, delta: number) {
    const current = notebooks[design] ?? 0;
    const next = Math.max(0, current + delta);
    if (delta > 0 && total >= NOTEBOOKS_PER_JOURNAL) return;
    const updated = { ...notebooks, [design]: next };
    if (next === 0) delete updated[design];
    onChange(updated);
  }

  return (
    <div>
      <h2 className="text-3xl font-serif text-[#1c1c1a]">Choose your 3 notebooks</h2>
      <p className="mt-2 text-[#6b6a63]">Every journal ships with 3 refill notebooks inside. Mix &amp; match freely.</p>

      <div className="mt-6 flex items-center gap-3">
        <div className="flex flex-1 gap-1.5">
          {Array.from({ length: NOTEBOOKS_PER_JOURNAL }).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 flex-1 rounded-full ${i < total ? "bg-[#0f3d34]" : "bg-[#eae7de]"}`}
            />
          ))}
        </div>
        <span className="whitespace-nowrap text-sm text-[#6b6a63]">{total} of {NOTEBOOKS_PER_JOURNAL} chosen</span>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        {entries.map((n) => {
          const count = notebooks[n.design] ?? 0;
          const atLimit = total >= NOTEBOOKS_PER_JOURNAL && count === 0;
          return (
            <div
              key={n.variantId}
              className={`flex items-center gap-4 rounded-xl border-2 p-4 transition-colors ${
                count > 0 ? "border-[#0f3d34] bg-[#0f3d34]/[0.03]" : "border-[#eae7de]"
              } ${atLimit ? "opacity-40" : ""}`}
            >
              <NotebookIcon design={n.design} />
              <div className="min-w-0 flex-1">
                <div className="font-medium text-[#1c1c1a]">{n.design}</div>
                <div className="text-xs text-[#a89a80]">{DESCRIPTIONS[n.design]}</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCount(n.design, -1)}
                  disabled={count === 0}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0f3d34] text-white text-sm disabled:opacity-30"
                >
                  −
                </button>
                <span className="w-4 text-center text-sm font-medium text-[#1c1c1a]">{count}</span>
                <button
                  type="button"
                  onClick={() => setCount(n.design, 1)}
                  disabled={atLimit}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0f3d34] text-white text-sm disabled:opacity-30"
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-5 text-xs text-[#a89a80]">{NOTEBOOK_SPEC_NOTE}</p>

      {remaining > 0 && (
        <p className="mt-3 text-sm text-[#b1632f]">
          Pick {remaining} more notebook{remaining > 1 ? "s" : ""} to continue.
        </p>
      )}
    </div>
  );
}
