"use client";

import { buildCordEntries } from "@/lib/catalog";
import type { ShopifyJournalProduct } from "@/lib/shopify-admin";
import { Swatch } from "@/components/Swatch";
import { DisabledHint } from "@/components/DisabledHint";

interface CordStepProps {
  product: ShopifyJournalProduct;
  cord: string;
  onCordChange: (value: string) => void;
  swatchByLabel?: Record<string, string>;
}

export function CordStep({ product, cord, onCordChange, swatchByLabel }: CordStepProps) {
  const entries = buildCordEntries(product, swatchByLabel);
  const current = entries.find((c) => c.label === cord);

  return (
    <div className="step-fade-in">
      <h2 className="text-xl font-heading text-[var(--ink)]">Pick a closure string</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        The string wraps the journal shut and doubles as a bookmark button — required for every journal.
      </p>

      <div className="mt-4 flex flex-wrap gap-4">
        {entries.map((o) => (
          <DisabledHint key={o.label} message={!o.inStock ? "Out of stock" : null}>
            <Swatch
              label={o.label}
              selected={cord === o.label}
              onClick={() => onCordChange(o.label)}
              color={o.swatch}
              disabled={!o.inStock}
            />
          </DisabledHint>
        ))}
      </div>

      {current ? (
        <div className="mt-4 flex items-center gap-3 rounded-[var(--radius-panel)] bg-[var(--surface-soft)] px-4 py-2.5">
          <span className="h-4 w-4 rounded-full border border-black/10" style={{ backgroundColor: current.swatch }} />
          <span className="text-sm text-[var(--ink)] font-medium">{current.label} string</span>
        </div>
      ) : (
        <p className="mt-4 text-sm text-[var(--brand)]">Pick a string color to continue.</p>
      )}
    </div>
  );
}
