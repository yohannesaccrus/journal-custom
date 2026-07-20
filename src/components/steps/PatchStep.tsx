"use client";

import { buildPatchEntries } from "@/lib/catalog";
import { formatIDR } from "@/lib/pricing";
import type { ShopifyJournalProduct } from "@/lib/shopify-admin";
import { PatchIcon } from "@/components/PatchIcon";
import type { JournalSelection } from "@/lib/types";

interface PatchStepProps {
  patchProduct: ShopifyJournalProduct;
  cord: string;
  patch: JournalSelection["patch"];
  onPatchChange: (value: JournalSelection["patch"]) => void;
}

export function PatchStep({ patchProduct, cord, patch, onPatchChange }: PatchStepProps) {
  const patchEntries = buildPatchEntries(patchProduct);
  const cordSelected = cord !== "none";

  return (
    <div>
      <h2 className="text-xl font-serif text-[#1c1c1a]">Cord patch</h2>
      <p className="mt-1 text-sm text-[#6b6a63]">
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
            className={`flex h-11 w-11 items-center justify-center rounded-lg border-2 bg-[#f7f5f0] transition-all ${
              patch === "none" ? "border-[#0f3d34] ring-2 ring-[#0f3d34]/30" : "border-transparent group-hover:border-[#0f3d34]/30"
            }`}
          >
            <span className="text-[10px] text-[#a89a80]">None</span>
          </span>
          <span className="text-xs text-[#2a2a28]">No patch</span>
        </button>

        {patchEntries.map((p) => (
          <button
            key={p.variantId}
            type="button"
            onClick={() => onPatchChange(p.shape)}
            disabled={!cordSelected}
            className="flex flex-col items-center gap-1.5 group disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span
              className={`flex h-11 w-11 items-center justify-center rounded-lg border-2 bg-[#f7f5f0] transition-all ${
                patch === p.shape ? "border-[#0f3d34] ring-2 ring-[#0f3d34]/30" : "border-transparent group-hover:border-[#0f3d34]/30"
              }`}
            >
              <PatchIcon shape={p.shape} className="h-6 w-6" />
            </span>
            <span className="text-xs text-[#2a2a28] capitalize">{p.shape}</span>
            <span className="text-[10px] text-[#b1632f] -mt-1">+{formatIDR(p.price)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
