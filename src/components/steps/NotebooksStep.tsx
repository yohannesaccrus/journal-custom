"use client";

import { buildNotebookEntries, NOTEBOOK_SPEC_NOTE, NOTEBOOKS_PER_JOURNAL, notebookCount } from "@/lib/catalog";
import { NotebookIcon } from "@/components/NotebookIcon";
import { DisabledHint } from "@/components/DisabledHint";
import type { ShopifyJournalProduct } from "@/lib/shopify-admin";

interface NotebooksStepProps {
  notebookProduct: ShopifyJournalProduct;
  notebooks: Record<string, number>;
  notebooksNote: string;
  onChange: (notebooks: Record<string, number>) => void;
  onNoteChange: (note: string) => void;
}

const DESCRIPTIONS: Record<string, string> = {
  "To-Do List": "Checklists & daily tasks",
  "Lined Notebook": "Writing & journaling",
  "Blank Notebook": "Sketching & freeform",
  "Extra Notebook": "Tell us what you'd like inside",
};

export function NotebooksStep({ notebookProduct, notebooks, notebooksNote, onChange, onNoteChange }: NotebooksStepProps) {
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

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 step-fade-in">
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
              {n.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- small fixed-size thumbnail, not worth next/image's overhead here
                <img src={n.imageUrl} alt="" className="h-14 w-11 shrink-0 rounded-sm object-cover shadow-sm" />
              ) : (
                <NotebookIcon design={n.design} />
              )}
              <div className="min-w-0 flex-1">
                <div className="font-medium text-[var(--ink)]">{n.design}</div>
                <div className="text-xs text-[var(--faint)]">
                  {n.inStock ? DESCRIPTIONS[n.design] : "Out of stock"}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
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

      {(notebooks["Extra Notebook"] ?? 0) > 0 && (
        <div className="mt-4 step-fade-in">
          <label htmlFor="extra-notebook-note" className="text-sm font-medium text-[var(--ink)]">
            What would you like in your Extra Notebook{(notebooks["Extra Notebook"] ?? 0) > 1 ? "s" : ""}?
          </label>
          <textarea
            id="extra-notebook-note"
            value={notebooksNote}
            onChange={(e) => onNoteChange(e.target.value)}
            placeholder="e.g. recipe cards, a travel itinerary template, a habit tracker…"
            rows={3}
            className="mt-1.5 w-full resize-none rounded-[var(--radius-panel)] border-2 border-[var(--border)] bg-white p-3 text-sm text-[var(--ink)] placeholder:text-[var(--faint)] focus:border-[var(--accent)] focus:outline-none"
          />
        </div>
      )}

      <p className="mt-5 text-xs text-[var(--faint)]">{NOTEBOOK_SPEC_NOTE}</p>

      {remaining > 0 && (
        <p className="mt-3 text-sm text-[var(--brand)]">
          Pick {remaining} more notebook{remaining > 1 ? "s" : ""} to continue.
        </p>
      )}
    </div>
  );
}
