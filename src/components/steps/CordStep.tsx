"use client";

import { buildCordEntries } from "@/lib/catalog";
import type { ShopifyJournalProduct } from "@/lib/shopify-admin";
import { Swatch } from "@/components/Swatch";

interface CordStepProps {
  products: ShopifyJournalProduct[];
  cord: string;
  onChange: (value: string) => void;
}

export function CordStep({ products, cord, onChange }: CordStepProps) {
  const entries = buildCordEntries(products);
  const current = entries.find((c) => c.label === cord);

  return (
    <div>
      <h2 className="text-3xl font-serif text-[#1c1c1a]">Pick a closure cord</h2>
      <p className="mt-2 text-[#6b6a63]">
        The cord wraps the journal shut and doubles as a bookmark button.
      </p>

      <div className="mt-8 flex flex-wrap gap-6">
        <Swatch label="No cord" selected={cord === "none"} onClick={() => onChange("none")} color="#ffffff" />
        {entries.map((o) => (
          <Swatch key={o.label} label={o.label} selected={cord === o.label} onClick={() => onChange(o.label)} color={o.swatch} />
        ))}
      </div>

      {current && (
        <div className="mt-8 flex items-center gap-3 rounded-xl bg-[#f7f5f0] px-5 py-4">
          <span className="h-5 w-5 rounded-full border border-black/10" style={{ backgroundColor: current.swatch }} />
          <span className="text-[#1c1c1a] font-medium">{current.label} cord</span>
        </div>
      )}
    </div>
  );
}
