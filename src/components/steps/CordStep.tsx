"use client";

import { buildCordEntries } from "@/lib/catalog";
import type { ShopifyJournalProduct } from "@/lib/shopify-admin";
import { Swatch } from "@/components/Swatch";

interface CordStepProps {
  products: ShopifyJournalProduct[];
  cord: string;
  onCordChange: (value: string) => void;
}

export function CordStep({ products, cord, onCordChange }: CordStepProps) {
  const entries = buildCordEntries(products);
  const current = entries.find((c) => c.label === cord);

  return (
    <div>
      <h2 className="text-xl font-serif text-[#1c1c1a]">Pick a closure cord</h2>
      <p className="mt-1 text-sm text-[#6b6a63]">
        The cord wraps the journal shut and doubles as a bookmark button.
      </p>

      <div className="mt-4 flex flex-wrap gap-4">
        <Swatch label="No cord" selected={cord === "none"} onClick={() => onCordChange("none")} color="#ffffff" />
        {entries.map((o) => (
          <Swatch key={o.label} label={o.label} selected={cord === o.label} onClick={() => onCordChange(o.label)} color={o.swatch} />
        ))}
      </div>

      {current && (
        <div className="mt-4 flex items-center gap-3 rounded-xl bg-[#f7f5f0] px-4 py-2.5">
          <span className="h-4 w-4 rounded-full border border-black/10" style={{ backgroundColor: current.swatch }} />
          <span className="text-sm text-[#1c1c1a] font-medium">{current.label} cord</span>
        </div>
      )}
    </div>
  );
}
