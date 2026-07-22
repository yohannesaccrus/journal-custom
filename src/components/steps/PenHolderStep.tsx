"use client";

import { buildCordEntries, buildPenHolderEntries, isEdgeInStock, resolveVariant } from "@/lib/catalog";
import type { ShopifyJournalProduct } from "@/lib/shopify-admin";
import { useCurrencyFormat } from "@/components/CurrencyContext";
import { Swatch } from "@/components/Swatch";
import { DisabledHint } from "@/components/DisabledHint";
import type { JournalSelection } from "@/lib/types";

interface PenHolderStepProps {
  product: ShopifyJournalProduct;
  selection: JournalSelection;
  onPenHolderChange: (slug: JournalSelection["penHolder"]) => void;
  onEdgeChange: (edge: boolean) => void;
}

export function PenHolderStep({ product, selection, onPenHolderChange, onEdgeChange }: PenHolderStepProps) {
  const { format } = useCurrencyFormat();
  const hasPenHolder = selection.penHolder !== "none";

  // Shopify only has pen-holder variants paired with an actual cord color —
  // picking a pen holder color auto-selects the first cord behind the scenes
  // (see handlePenHolderChange in JournalCustomizer). Price previews here
  // need that same substitution, or resolving a "No Cord + Pen Holder"
  // variant that doesn't exist would throw before the user even clicks.
  const effectiveCord = selection.cord !== "none" ? selection.cord : buildCordEntries(product)[0]?.label ?? selection.cord;
  const entries = buildPenHolderEntries(product, effectiveCord);
  const edgeInStock = selection.penHolder !== "none" ? isEdgeInStock(product, effectiveCord, selection.penHolder) : true;

  const priceAt = (penHolder: JournalSelection["penHolder"], edge: boolean) => {
    const cord = penHolder === "none" ? selection.cord : effectiveCord;
    return Number(resolveVariant(product, { ...selection, cord, penHolder, edge }).price);
  };

  const basePrice = priceAt("none", false);
  const edgeDelta = hasPenHolder ? priceAt(selection.penHolder, true) - priceAt(selection.penHolder, false) : 0;

  return (
    <div className="step-fade-in">
      <h2 className="text-xl font-heading text-[var(--ink)]">Pen holder & corner edge</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">An elastic loop that holds a pen against the spine.</p>

      <div className="mt-4 flex flex-wrap gap-4">
        <Swatch
          label="No pen holder"
          selected={selection.penHolder === "none"}
          onClick={() => onPenHolderChange("none")}
          color="#ffffff"
        />
        {entries.map((o) => {
          const slug = o.label.toLowerCase() as JournalSelection["penHolder"];
          const delta = priceAt(slug, false) - basePrice;
          return (
            <DisabledHint key={o.label} message={!o.inStock ? "Out of stock" : null}>
              <Swatch
                label={o.label}
                selected={selection.penHolder === slug}
                onClick={() => onPenHolderChange(slug)}
                color={o.swatch}
                priceLabel={delta > 0 ? `+${format(delta)}` : undefined}
                disabled={!o.inStock}
              />
            </DisabledHint>
          );
        })}
      </div>

      <div className="mt-5 border-t border-[var(--border)] pt-5">
        <h3 className="text-base font-heading text-[var(--ink)]">Corner edge accents</h3>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Reinforced leather corners on all four edges of the cover.
        </p>
        <div className="mt-3 flex gap-3">
          <button
            type="button"
            disabled={!hasPenHolder}
            onClick={() => onEdgeChange(false)}
            className={`px-4 py-1.5 rounded-[var(--radius-button)] text-xs font-medium border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              !selection.edge ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--border)] text-[var(--muted)]"
            }`}
          >
            No edge
          </button>
          <DisabledHint message={hasPenHolder && !edgeInStock ? "Out of stock" : null}>
            <button
              type="button"
              disabled={!hasPenHolder || !edgeInStock}
              onClick={() => onEdgeChange(true)}
              className={`px-4 py-1.5 rounded-[var(--radius-button)] text-xs font-medium border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                selection.edge ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--border)] text-[var(--muted)]"
              }`}
            >
              Add edge{" "}
              <span className={selection.edge ? "text-white/70" : "text-[var(--brand)]"}>
                +{format(edgeDelta)}
              </span>
            </button>
          </DisabledHint>
        </div>
        {!hasPenHolder && (
          <p className="mt-2 text-xs text-[var(--faint)]">Select a pen holder color to unlock corner edges.</p>
        )}
      </div>
    </div>
  );
}
