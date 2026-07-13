"use client";

import { buildCoverEntries, charmsTotal, resolveVariant } from "@/lib/catalog";
import type { ShopifyJournalProduct } from "@/lib/shopify-admin";
import { formatIDR } from "@/lib/pricing";
import type { JournalSelection } from "@/lib/types";

interface PreviewStepProps {
  products: ShopifyJournalProduct[];
  product: ShopifyJournalProduct;
  charmProduct: ShopifyJournalProduct;
  selection: JournalSelection;
  onAddToCart: () => void;
  adding?: boolean;
  error?: string | null;
}

export function PreviewStep({ products, product, charmProduct, selection, onAddToCart, adding, error }: PreviewStepProps) {
  const cover = buildCoverEntries(products).find((c) => c.handle === product.handle);
  const variant = resolveVariant(product, selection);
  const charmsPrice = charmsTotal(charmProduct, selection.charms);
  const total = Number(variant.price) + charmsPrice;

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
    { label: "Cord", value: selection.cord !== "none" ? selection.cord : "None" },
    { label: "Pen holder", value: selection.penHolder === "none" ? "None" : selection.penHolder === "black" ? "Black" : "Brown" },
    { label: "Corner edge", value: selection.edge && selection.penHolder !== "none" ? "Yes" : "No" },
    { label: "Charms", value: charmSummary },
    { label: "Notebooks", value: notebookSummary },
    { label: "SKU", value: variant.sku },
  ];

  return (
    <div>
      <h2 className="text-3xl font-serif text-[#1c1c1a]">Your journal is ready</h2>
      <p className="mt-2 text-[#6b6a63]">Review the details before adding it to your cart.</p>

      <dl className="mt-8 divide-y divide-[#eae7de] rounded-xl bg-[#f7f5f0] px-6">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between py-4">
            <dt className="text-sm text-[#6b6a63]">{r.label}</dt>
            <dd className="text-sm font-medium text-[#1c1c1a]">{r.value}</dd>
          </div>
        ))}
        <div className="flex items-center justify-between py-4">
          <dt className="text-sm text-[#6b6a63]">Price</dt>
          <dd className="text-base font-semibold text-[#1c1c1a]">{formatIDR(total)}</dd>
        </div>
      </dl>

      <button
        type="button"
        onClick={onAddToCart}
        disabled={adding}
        className="mt-8 w-full sm:w-auto rounded-full bg-[#0f3d34] px-8 py-3.5 text-white font-medium hover:bg-[#0c332b] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {adding ? "Adding to cart…" : `Add to cart — ${formatIDR(total)}`}
      </button>

      {error && (
        <p className="mt-3 text-sm text-[#b5342c]">{error}</p>
      )}
    </div>
  );
}
