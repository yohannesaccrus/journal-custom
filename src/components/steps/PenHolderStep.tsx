"use client";

import { buildPenHolderEntries, resolveVariant } from "@/lib/catalog";
import type { ShopifyJournalProduct } from "@/lib/shopify-admin";
import { formatIDR } from "@/lib/pricing";
import { Swatch } from "@/components/Swatch";
import type { JournalSelection } from "@/lib/types";

interface PenHolderStepProps {
  product: ShopifyJournalProduct;
  selection: JournalSelection;
  onPenHolderChange: (slug: JournalSelection["penHolder"]) => void;
  onEdgeChange: (edge: boolean) => void;
}

export function PenHolderStep({ product, selection, onPenHolderChange, onEdgeChange }: PenHolderStepProps) {
  const cordSelected = selection.cord !== "none";
  const hasPenHolder = selection.penHolder !== "none";
  const entries = buildPenHolderEntries([product]);

  const priceAt = (penHolder: JournalSelection["penHolder"], edge: boolean) =>
    cordSelected ? Number(resolveVariant(product, { ...selection, penHolder, edge }).price) : 0;

  const basePrice = cordSelected ? priceAt("none", false) : 0;
  const edgeDelta = hasPenHolder && cordSelected ? priceAt(selection.penHolder, true) - priceAt(selection.penHolder, false) : 0;

  return (
    <div>
      <h2 className="text-xl font-serif text-[#1c1c1a]">Pen holder & corner edge</h2>
      <p className="mt-1 text-sm text-[#6b6a63]">
        {cordSelected
          ? "An elastic loop that holds a pen against the spine."
          : "Requires a cord — go back and pick one to unlock the pen holder."}
      </p>

      <div className="mt-4 flex flex-wrap gap-4">
        <Swatch
          label="No pen holder"
          selected={selection.penHolder === "none"}
          onClick={() => onPenHolderChange("none")}
          color="#ffffff"
          disabled={!cordSelected}
        />
        {entries.map((o) => {
          const slug = o.label.toLowerCase() as JournalSelection["penHolder"];
          const delta = cordSelected ? priceAt(slug, false) - basePrice : 0;
          return (
            <Swatch
              key={o.label}
              label={o.label}
              selected={selection.penHolder === slug}
              onClick={() => onPenHolderChange(slug)}
              color={o.swatch}
              priceLabel={delta > 0 ? `+${formatIDR(delta)}` : undefined}
              disabled={!cordSelected}
            />
          );
        })}
      </div>

      <div className="mt-5 border-t border-[#eae7de] pt-5">
        <h3 className="text-base font-serif text-[#1c1c1a]">Corner edge accents</h3>
        <p className="mt-1 text-xs text-[#6b6a63]">
          Reinforced leather corners on all four edges of the cover.
        </p>
        <div className="mt-3 flex gap-3">
          <button
            type="button"
            disabled={!hasPenHolder}
            onClick={() => onEdgeChange(false)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              !selection.edge ? "border-[#0f3d34] bg-[#0f3d34] text-white" : "border-[#d8d5cb] text-[#6b6a63]"
            }`}
          >
            No edge
          </button>
          <button
            type="button"
            disabled={!hasPenHolder}
            onClick={() => onEdgeChange(true)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              selection.edge ? "border-[#0f3d34] bg-[#0f3d34] text-white" : "border-[#d8d5cb] text-[#6b6a63]"
            }`}
          >
            Add edge{" "}
            <span className={selection.edge ? "text-white/70" : "text-[#b1632f]"}>
              +{formatIDR(edgeDelta)}
            </span>
          </button>
        </div>
        {!hasPenHolder && cordSelected && (
          <p className="mt-2 text-xs text-[#a89a80]">Select a pen holder color to unlock corner edges.</p>
        )}
      </div>
    </div>
  );
}
