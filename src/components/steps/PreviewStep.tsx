"use client";

import { buildCoverEntries, EDGE_LABEL, resolveVariant } from "@/lib/catalog";
import type { ShopifyJournalProduct, ShopifyVariant } from "@/lib/shopify-admin";
import { useCurrencyFormat } from "@/components/CurrencyContext";
import type { JournalSelection } from "@/lib/types";

interface PreviewStepProps {
  products: ShopifyJournalProduct[];
  product: ShopifyJournalProduct;
  charmProduct: ShopifyJournalProduct;
  pouchVariant?: ShopifyVariant;
  selection: JournalSelection;
  onAddToCart: () => void;
  adding?: boolean;
  error?: string | null;
}

export function PreviewStep({ products, product, charmProduct, pouchVariant, selection, onAddToCart, adding, error }: PreviewStepProps) {
  const { formatConverted, priceFor } = useCurrencyFormat();
  const cover = buildCoverEntries(products).find((c) => c.handle === product.handle);
  const variant = resolveVariant(product, selection);
  const charmPriceByVariant = new Map(charmProduct.variants.map((v) => [v.id, Number(v.price)]));
  // Patch price is baked into `variant.price` now (a real 4th option on the
  // journal product), not a separate add-on total. `priceFor` reports these
  // exact variant ids to CurrencyContext and returns their real contextual
  // price when available (falling back to the multiplier estimate) -- see
  // useReportPricedVariants in JournalCustomizer, which already reports the
  // same ids this step is displaying.
  const total =
    priceFor(variant.id, Number(variant.price), "journal") +
    selection.charms.reduce((sum, c) => sum + priceFor(c.variantId, charmPriceByVariant.get(c.variantId) ?? 0, "charm"), 0) +
    (selection.pouch && pouchVariant ? priceFor(pouchVariant.id, Number(pouchVariant.price), "pouch") : 0);
  const extraNotebookNote = (selection.notebooks["Extra Notebook"] ?? 0) > 0 ? selection.notebooksNote.trim() : "";

  const frontCharms = selection.charms.filter((c) => c.side === "front").length;
  const backCharms = selection.charms.filter((c) => c.side === "back").length;
  const sideCharms = selection.charms.filter((c) => c.side === "side").length;
  const charmSummary =
    selection.charms.length === 0
      ? "None"
      : [
          frontCharms > 0 ? `${frontCharms} front` : null,
          backCharms > 0 ? `${backCharms} back` : null,
          sideCharms > 0 ? `${sideCharms} side` : null,
        ]
          .filter(Boolean)
          .join(", ");

  const notebookSummary =
    Object.keys(selection.notebooks).length === 0
      ? "None chosen"
      : Object.entries(selection.notebooks)
          .map(([design, count]) => `${count}× ${design}`)
          .join(", ");

  const rows = [
    { label: "Cover", value: cover?.label ?? product.title },
    { label: "String", value: selection.cord !== "none" ? selection.cord : "None" },
    { label: "Patch", value: selection.patch === "none" ? "None" : selection.patch.charAt(0).toUpperCase() + selection.patch.slice(1) },
    { label: "Pen holder", value: selection.penHolder === "none" ? "None" : selection.penHolder === "black" ? "Black" : "Brown" },
    {
      label: "Corner edge",
      value: selection.edge !== "none" && selection.penHolder !== "none" ? EDGE_LABEL[selection.edge] : "None",
    },
    { label: "Charms", value: charmSummary },
    { label: "Notebooks", value: notebookSummary },
    { label: "Pouch", value: selection.pouch ? "Plastic Pouch" : "None" },
  ];

  return (
    <div className="step-fade-in">
      <h2 className="text-3xl font-heading text-[var(--ink)]">Your journal is ready</h2>
      <p className="mt-2 text-[var(--muted)]">Review the details before adding it to your cart.</p>

      <dl className="mt-8 divide-y divide-[var(--border)] rounded-[var(--radius-panel)] bg-[var(--surface-soft)] px-6 step-fade-in">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between py-4">
            <dt className="text-sm text-[var(--muted)]">{r.label}</dt>
            <dd className="text-sm font-medium text-[var(--ink)]">{r.value}</dd>
          </div>
        ))}
        {extraNotebookNote && (
          <div className="py-4">
            <dt className="text-sm text-[var(--muted)]">Extra notebook details</dt>
            <dd className="mt-1.5 text-sm font-medium text-[var(--ink)]">{extraNotebookNote}</dd>
          </div>
        )}
        <div className="py-4">
          <dt className="text-sm text-[var(--muted)]">SKU</dt>
          <dd className="mt-1.5 break-all font-mono text-xs text-[var(--muted)]">{variant.sku}</dd>
        </div>
        <div className="flex items-center justify-between py-4">
          <dt className="text-sm text-[var(--muted)]">Price</dt>
          <dd className="text-base font-semibold text-[var(--ink)]">{formatConverted(total)}</dd>
        </div>
      </dl>

      <button
        type="button"
        onClick={onAddToCart}
        disabled={adding}
        className="btn-continue mt-8 w-full sm:w-auto rounded-[var(--radius-button)] bg-[var(--accent)] px-8 py-3.5 text-white font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {adding ? "Adding to cart…" : `Add to cart — ${formatConverted(total)}`}
      </button>

      {error && (
        <p className="mt-3 text-sm text-[#b5342c]">{error}</p>
      )}
    </div>
  );
}
