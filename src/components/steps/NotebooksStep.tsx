"use client";

import { buildNotebookEntries, NOTEBOOK_SPEC_NOTE, NOTEBOOKS_PER_JOURNAL, notebookCount } from "@/lib/catalog";
import { NotebookIcon } from "@/components/NotebookIcon";
import { DisabledHint } from "@/components/DisabledHint";
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
    <div className="step-fade-in">
      <h2 className="text-xl font-heading text-[var(--ink)]">Choose your 3 notebooks</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">Every journal ships with 3 refill notebooks inside. Mix &amp; match freely.</p>

      <div className="mt-4 flex items-center gap-3">
        <div className="flex flex-1 gap-1.5">
          {Array.from({ length: NOTEBOOKS_PER_JOURNAL }).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 flex-1 rounded-full ${i < total ? "bg-[var(--accent)]" : "bg-[var(--border)]"}`}
            />
          ))}
        </div>
        <span className="whitespace-nowrap text-sm text-[var(--muted)]">{total} of {NOTEBOOKS_PER_JOURNAL} chosen</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 step-fade-in">
        {entries.map((n) => {
          const count = notebooks[n.design] ?? 0;
          const atLimit = total >= NOTEBOOKS_PER_JOURNAL && count === 0;
          const addDisabled = atLimit || !n.inStock;
          return (
            <div
              key={n.variantId}
              className={`flex items-center gap-3 rounded-[var(--radius-panel)] border-2 p-3 transition-colors ${
                count > 0 ? "border-[var(--accent)] bg-[var(--accent)]/[0.03]" : "border-[var(--border)]"
              } ${atLimit || !n.inStock ? "opacity-40" : ""}`}
            >
              <NotebookIcon design={n.design} />
              <div className="min-w-0 flex-1">
                <div className="font-medium text-[var(--ink)]">{n.design}</div>
                <div className="text-xs text-[var(--faint)]">
                  {n.inStock ? DESCRIPTIONS[n.design] : "Out of stock"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCount(n.design, -1)}
                  disabled={count === 0}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent)] text-white text-sm disabled:opacity-30"
                >
                  −
                </button>
                <span className="w-4 text-center text-sm font-medium text-[var(--ink)]">{count}</span>
                <DisabledHint message={!n.inStock ? "Out of stock" : null}>
                  <button
                    type="button"
                    onClick={() => setCount(n.design, 1)}
                    disabled={addDisabled}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent)] text-white text-sm disabled:opacity-30"
                  >
                    +
                  </button>
                </DisabledHint>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-5 text-xs text-[var(--faint)]">{NOTEBOOK_SPEC_NOTE}</p>

      {remaining > 0 && (
        <p className="mt-3 text-sm text-[var(--brand)]">
          Pick {remaining} more notebook{remaining > 1 ? "s" : ""} to continue.
        </p>
      )}
    </div>
  );
}
