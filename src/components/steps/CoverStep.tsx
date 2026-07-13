"use client";

import { buildCoverEntries } from "@/lib/catalog";
import type { ShopifyJournalProduct } from "@/lib/shopify-admin";
import { formatIDR } from "@/lib/pricing";
import { Swatch } from "@/components/Swatch";
import type { CoverCategory } from "@/lib/types";

interface CoverStepProps {
  products: ShopifyJournalProduct[];
  cover: string;
  category: CoverCategory;
  onCategoryChange: (c: CoverCategory) => void;
  onCoverChange: (handle: string) => void;
}

export function CoverStep({ products, cover, category, onCategoryChange, onCoverChange }: CoverStepProps) {
  const entries = buildCoverEntries(products);
  const options = entries.filter((o) => o.category === category);
  const current = entries.find((o) => o.handle === cover);
  const patternDeltaMin = Math.min(
    ...entries.filter((o) => o.category === "pattern").map((o) => o.priceDelta)
  );

  return (
    <div>
      <h2 className="text-3xl font-serif text-[#1c1c1a]">Choose your leather cover</h2>
      <p className="mt-2 text-[#6b6a63]">All covers are hand-stitched from full-grain leather.</p>

      <div className="mt-6 inline-flex rounded-full bg-[#f2f0ea] p-1">
        <button
          type="button"
          onClick={() => onCategoryChange("classic")}
          className={`px-6 py-2.5 rounded-full text-sm font-medium transition-colors ${
            category === "classic" ? "bg-white shadow text-[#0f3d34]" : "text-[#6b6a63]"
          }`}
        >
          Classic Leather
        </button>
        <button
          type="button"
          onClick={() => onCategoryChange("pattern")}
          className={`px-6 py-2.5 rounded-full text-sm font-medium transition-colors ${
            category === "pattern" ? "bg-white shadow text-[#0f3d34]" : "text-[#6b6a63]"
          }`}
        >
          Animal Print <span className="text-[#b1632f]">+{formatIDR(patternDeltaMin)}</span>
        </button>
      </div>

      <div className="mt-8 flex flex-wrap gap-6">
        {options.map((o) => (
          <Swatch
            key={o.handle}
            label={o.label}
            selected={cover === o.handle}
            onClick={() => onCoverChange(o.handle)}
            color={o.swatch}
            thumbnail={o.thumbnail}
            priceLabel={o.priceDelta > 0 ? `+${formatIDR(o.priceDelta)}` : undefined}
          />
        ))}
      </div>

      {current && (
        <div className="mt-8 flex items-center gap-3 rounded-xl bg-[#f7f5f0] px-5 py-4">
          <span
            className="h-5 w-5 rounded-full border border-black/10 overflow-hidden shrink-0"
            style={current.swatch ? { backgroundColor: current.swatch } : undefined}
          >
            {!current.swatch && current.thumbnail && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={current.thumbnail} alt="" className="h-full w-full object-cover" />
            )}
          </span>
          <span className="text-[#1c1c1a] font-medium">{current.label}</span>
        </div>
      )}
    </div>
  );
}
