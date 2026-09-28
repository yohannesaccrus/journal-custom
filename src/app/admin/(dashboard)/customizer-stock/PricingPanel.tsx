"use client";

import type { CzPrice, CzPriceKey } from "@/lib/admin/cz-stock";
import { formatMoney } from "@/lib/markets";
import { useMarket } from "../MarketContext";
import { PriceEditor } from "./PriceEditor";

/** One real price: a Shopify product the customizer adds to the cart, shared by every asset in its group. */
export interface CzPriceGroup {
  key: CzPriceKey;
  label: string;
  /** Which assets use it, e.g. "Black, Brown, Pink, Blue". */
  appliesTo: string;
  /** Said in the save dialog: what else changes. */
  scope: string;
  price: CzPrice | null;
  /** Charged on top of another price (the animal upgrade on top of the journal). */
  addOn?: boolean;
}

export type CzPricing = { groups: CzPriceGroup[]; note: string } | { included: string };

/** One column per price, so no empty cell is left over. */
const COLS: Record<number, string> = { 1: "", 2: "sm:grid-cols-2", 3: "sm:grid-cols-3" };

/**
 * The only place a category's prices are edited: one field per Shopify product, with why it
 * covers several assets. The Price column in the table below is a read-only preview.
 */
export function PricingPanel({ pricing, enabled }: { pricing: CzPricing; enabled: boolean }) {
  if ("included" in pricing) {
    return (
      <div className="mx-5 mt-4 flex items-center gap-2 rounded-xl border border-dashed border-[#0f3d34]/20 bg-[#0f3d34]/[0.03] px-4 py-3 text-sm text-[#3d3c37]">
        <span className="rounded-full bg-[#2f7a63]/12 px-2 py-0.5 text-[11px] font-medium text-[#22604d] ring-1 ring-inset ring-[#2f7a63]/20">Included</span>
        {pricing.included}
      </div>
    );
  }
  return (
    <div className="mx-5 mt-4 overflow-hidden rounded-xl border border-[#0f3d34]/15 bg-gradient-to-br from-white/85 to-[#f2ece1]/70">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-[#0f3d34]/10 px-4 py-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#b1632f]">Pricing</span>
        <p className="min-w-0 flex-1 text-xs leading-relaxed text-[#6b6a63]">{pricing.note}</p>
      </div>
      <div className={`grid gap-px bg-[#0f3d34]/10 ${COLS[Math.min(pricing.groups.length, 3)]}`}>
        {pricing.groups.map((g) => (
          <PriceTile key={g.key} group={g} enabled={enabled} />
        ))}
      </div>
    </div>
  );
}

export function PriceTile({ group, enabled }: { group: CzPriceGroup; enabled: boolean }) {
  const { market } = useMarket();
  const idr = group.price?.idr;
  return (
    <div className="bg-[#faf8f3]/90 px-4 py-3.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6b6a63]">{group.label}</p>
      <div className="mt-1.5 flex items-center gap-1 font-serif text-xl tabular-nums text-[#0f3d34]">
        {group.addOn && <span className="text-[#b1632f]">+</span>}
        {group.price ? (
          <PriceEditor price={group.price} edit={{ key: group.key, scope: group.scope }} enabled={enabled} />
        ) : (
          <span className="font-sans text-sm text-[#b9b4a6]">Couldn&apos;t read price</span>
        )}
      </div>
      {market !== "ID" && idr != null && (
        <p className="mt-0.5 text-[11px] text-[#6b6a63]">Indonesia: {formatMoney(idr, "IDR")} · edited in IDR</p>
      )}
      <p className="mt-1 text-[11px] leading-snug text-[#8a877c]">{group.appliesTo}</p>
    </div>
  );
}
