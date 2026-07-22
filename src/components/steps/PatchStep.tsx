"use client";

import { buildPatchEntries } from "@/lib/catalog";
import { useCurrencyFormat } from "@/components/CurrencyContext";
import type { ShopifyJournalProduct } from "@/lib/shopify-admin";
import { PatchIcon } from "@/components/PatchIcon";
import { DisabledHint } from "@/components/DisabledHint";
import type { JournalSelection } from "@/lib/types";

interface PatchStepProps {
  patchProduct: ShopifyJournalProduct;
  cordSelected: boolean;
  patch: JournalSelection["patch"];
  onPatchChange: (value: JournalSelection["patch"]) => void;
}

export function PatchStep({ patchProduct, cordSelected, patch, onPatchChange }: PatchStepProps) {
  const { format } = useCurrencyFormat();
  const patchEntries = buildPatchEntries(patchProduct);

  return (
    <div className="step-fade-in">
      <h2 className="text-xl font-heading text-[var(--ink)]">Cord patch</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        {cordSelected
          ? "A stitched leather patch sitting right where the cord ties."
          : "Pick a cord first to unlock a patch."}
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
            key={p.variantId}
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
              <span className="text-[10px] text-[var(--brand)] -mt-1">+{format(p.price)}</span>
            </button>
          </DisabledHint>
        ))}
      </div>
    </div>
  );
}
