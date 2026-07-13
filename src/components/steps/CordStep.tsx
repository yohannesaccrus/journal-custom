"use client";

import { buildCordEntries, buildPatchEntries } from "@/lib/catalog";
import { formatIDR } from "@/lib/pricing";
import type { ShopifyJournalProduct } from "@/lib/shopify-admin";
import { Swatch } from "@/components/Swatch";
import { PatchIcon } from "@/components/PatchIcon";
import type { JournalSelection } from "@/lib/types";

interface CordStepProps {
  products: ShopifyJournalProduct[];
  patchProduct: ShopifyJournalProduct;
  cord: string;
  patch: JournalSelection["patch"];
  onCordChange: (value: string) => void;
  onPatchChange: (value: JournalSelection["patch"]) => void;
}

export function CordStep({ products, patchProduct, cord, patch, onCordChange, onPatchChange }: CordStepProps) {
  const entries = buildCordEntries(products);
  const current = entries.find((c) => c.label === cord);
  const patchEntries = buildPatchEntries(patchProduct);
  const cordSelected = cord !== "none";

  return (
    <div>
      <h2 className="text-3xl font-serif text-[#1c1c1a]">Pick a closure cord</h2>
      <p className="mt-2 text-[#6b6a63]">
        The cord wraps the journal shut and doubles as a bookmark button.
      </p>

      <div className="mt-8 flex flex-wrap gap-6">
        <Swatch label="No cord" selected={cord === "none"} onClick={() => onCordChange("none")} color="#ffffff" />
        {entries.map((o) => (
          <Swatch key={o.label} label={o.label} selected={cord === o.label} onClick={() => onCordChange(o.label)} color={o.swatch} />
        ))}
      </div>

      {current && (
        <div className="mt-8 flex items-center gap-3 rounded-xl bg-[#f7f5f0] px-5 py-4">
          <span className="h-5 w-5 rounded-full border border-black/10" style={{ backgroundColor: current.swatch }} />
          <span className="text-[#1c1c1a] font-medium">{current.label} cord</span>
        </div>
      )}

      <div className="mt-10 border-t border-[#eae7de] pt-8">
        <h3 className="text-lg font-serif text-[#1c1c1a]">Cord patch</h3>
        <p className="mt-1 text-sm text-[#6b6a63]">
          {cordSelected
            ? "A stitched leather patch sitting right where the cord ties."
            : "Pick a cord first to unlock a patch."}
        </p>

        <div className="mt-4 flex flex-wrap gap-6">
          <button
            type="button"
            onClick={() => onPatchChange("none")}
            disabled={!cordSelected}
            className="flex flex-col items-center gap-2 group disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span
              className={`flex h-16 w-16 items-center justify-center rounded-xl border-2 bg-[#f7f5f0] transition-all ${
                patch === "none" ? "border-[#0f3d34] ring-2 ring-[#0f3d34]/30" : "border-transparent group-hover:border-[#0f3d34]/30"
              }`}
            >
              <span className="text-xs text-[#a89a80]">None</span>
            </span>
            <span className="text-sm text-[#2a2a28]">No patch</span>
          </button>

          {patchEntries.map((p) => (
            <button
              key={p.variantId}
              type="button"
              onClick={() => onPatchChange(p.shape)}
              disabled={!cordSelected}
              className="flex flex-col items-center gap-2 group disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span
                className={`flex h-16 w-16 items-center justify-center rounded-xl border-2 bg-[#f7f5f0] transition-all ${
                  patch === p.shape ? "border-[#0f3d34] ring-2 ring-[#0f3d34]/30" : "border-transparent group-hover:border-[#0f3d34]/30"
                }`}
              >
                <PatchIcon shape={p.shape} className="h-9 w-9" />
              </span>
              <span className="text-sm text-[#2a2a28] capitalize">{p.shape}</span>
              <span className="text-xs text-[#b1632f] -mt-1">+{formatIDR(p.price)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
