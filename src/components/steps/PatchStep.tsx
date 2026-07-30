"use client";

import { buildPatchEntries } from "@/lib/catalog";
import { useCurrencyFormat } from "@/components/CurrencyContext";
import type { ShopifyJournalProduct } from "@/lib/shopify-admin";
import { PatchIcon } from "@/components/PatchIcon";
import { DisabledHint } from "@/components/DisabledHint";
import type { JournalSelection } from "@/lib/types";

interface PatchStepProps {
  product: ShopifyJournalProduct;
  cord: JournalSelection["cord"];
  penHolder: JournalSelection["penHolder"];
  edge: boolean;
  cordSelected: boolean;
  patch: JournalSelection["patch"];
  onPatchChange: (value: JournalSelection["patch"]) => void;
}

const PATCH_SHAPES = ["star", "heart"] as const;

export function PatchStep({ product, cord, penHolder, edge, cordSelected, patch, onPatchChange }: PatchStepProps) {
  const { format } = useCurrencyFormat();
  // Before a string is picked there's no combo to price/stock-check yet
  // (buildPatchEntries needs one) — show both shapes anyway, just disabled,
  // so the options aren't a mystery until the previous step is done.
  const patchEntries = cordSelected
    ? buildPatchEntries(product, cord, penHolder, edge)
    : PATCH_SHAPES.map((shape) => ({ shape, price: 0, inStock: true }));

  return (
    <div className="step-fade-in">
      <h2 className="text-xl font-heading text-[var(--ink)]">String patch</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        {cordSelected
          ? "A stitched leather patch sitting right where the string ties."
          : "Pick a string first to unlock a patch."}
      </p>

      <div className="mt-4 flex flex-wrap gap-4">
        <button
          type="button"
          onClick={() => onPatchChange("none")}
          disabled={!cordSelected}
          className="flex flex-col items-center gap-1.5 group disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span
            className={`flex h-11 w-11 items-center justify-center rounded-[var(--radius-chip)] border-2 bg-[var(--surface-soft)] transition-all ${
              patch === "none" ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/30" : "border-transparent group-hover:border-[var(--accent)]/30"
            }`}
          >
            <span className="text-[10px] text-[var(--faint)]">None</span>
          </span>
          <span className="text-xs text-[var(--ink)]">No patch</span>
        </button>

        {patchEntries.map((p) => (
          <DisabledHint
            key={p.shape}
            message={cordSelected && !p.inStock ? "Out of stock" : null}
          >
            <button
              type="button"
              onClick={() => onPatchChange(p.shape)}
              disabled={!cordSelected || !p.inStock}
              className="flex flex-col items-center gap-1.5 group disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span
                className={`flex h-11 w-11 items-center justify-center rounded-[var(--radius-chip)] border-2 bg-[var(--surface-soft)] transition-all ${
                  patch === p.shape ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/30" : "border-transparent group-hover:border-[var(--accent)]/30"
                }`}
              >
                <PatchIcon shape={p.shape} className="h-6 w-6" />
              </span>
              <span className="text-xs text-[var(--ink)] capitalize">{p.shape}</span>
              {cordSelected && <span className="text-[10px] text-[var(--brand)] -mt-1">+{format(p.price)}</span>}
            </button>
          </DisabledHint>
        ))}
      </div>
    </div>
  );
}
