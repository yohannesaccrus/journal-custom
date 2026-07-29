"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminProduct } from "@/lib/admin/shopify-admin-data";
import VariantThumbnail from "./VariantThumbnail";
import { useCurrency } from "../CurrencyContext";
import {
  CURRENCIES,
  convertToIDR,
  formatAmountInput,
  idrToInputValue,
  parseAmountInput,
  sanitizeAmountInput,
  toShopifyPriceString,
} from "@/lib/currency";

type Variant = AdminProduct["variants"][number];

function fuzzyMatch(query: string, target: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const t = target.toLowerCase();
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  return qi === q.length;
}

/** Drops the redundant "Cover" option value from a variant's title, e.g. "Classic Black A / Orange / Black + Edge" -> "Orange / Black + Edge" — the cover is already the row this panel is nested under. */
function comboLabel(variant: Variant): string {
  const parts = variant.selectedOptions.filter((o) => o.name !== "Cover").map((o) => o.value);
  return parts.join(" / ");
}

/**
 * The per-cover accordion body — every String × Pen Holder combination that
 * actually exists on the real sellable journal product for this cover (not
 * shown anywhere else in Assets & Stock). Editable: price, SKU, stock.
 * Renaming/deleting is intentionally not supported here — these variants'
 * identity comes from real option values customers pick in the customizer,
 * not free text.
 */
export default function JournalVariantsPanel({
  journalProduct,
  coverLabel,
}: {
  journalProduct: AdminProduct | undefined;
  coverLabel: string;
}) {
  const [query, setQuery] = useState("");

  if (!journalProduct) {
    return (
      <p className="px-5 py-4 text-xs text-[#a89a80]">
        No matching journal product found for &ldquo;{coverLabel}&rdquo; (tag:journal, Cover option value must
        match exactly).
      </p>
    );
  }

  const filtered = journalProduct.variants.filter((v) => fuzzyMatch(query, `${comboLabel(v)} ${v.sku}`));

  return (
    <div className="border-t border-[#e8e3d8] bg-[#faf8f2]">
      <div className="flex items-center gap-2 border-b border-[#e8e3d8] px-5 py-2.5">
        <svg className="h-3.5 w-3.5 shrink-0 text-[#a89a80]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search String/Pen Holder combo or SKU…"
          className="w-full max-w-xs bg-transparent text-xs text-[#1c1c1a] placeholder:text-[#a89a80] focus:outline-none"
        />
        <span className="ml-auto shrink-0 text-[11px] text-[#a89a80]">
          {filtered.length} of {journalProduct.variants.length} variants
        </span>
      </div>

      <div className="max-h-96 overflow-y-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="sticky top-0 bg-[#f2ece1] text-left text-[10px] uppercase tracking-wide text-[#6b6a63]">
              <th className="px-5 py-2 font-medium">Image</th>
              <th className="px-5 py-2 font-medium">String / Pen Holder</th>
              <th className="px-5 py-2 font-medium">SKU</th>
              <th className="px-5 py-2 font-medium">Price</th>
              <th className="px-5 py-2 font-medium">Stock</th>
              <th className="px-5 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((variant) => (
              <JournalComboRow key={variant.id} productId={journalProduct.id} variant={variant} />
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-6 text-center text-[#a89a80]">
                  No variants match &ldquo;{query}&rdquo;.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function JournalComboRow({ productId, variant }: { productId: string; variant: Variant }) {
  const router = useRouter();
  const { currency } = useCurrency();
  const currencyCfg = CURRENCIES[currency];
  const initialPriceIDR = Number(variant.price) || 0;
  const [sku, setSku] = useState(variant.sku);
  const [priceIDR, setPriceIDR] = useState(initialPriceIDR);
  const [stock, setStock] = useState(variant.inventoryQuantity);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const priceDisplay = formatAmountInput(idrToInputValue(priceIDR, currency), currency);
  const dirty = sku !== variant.sku || priceIDR !== initialPriceIDR || stock !== variant.inventoryQuantity;

  function reset() {
    setSku(variant.sku);
    setPriceIDR(initialPriceIDR);
    setStock(variant.inventoryQuantity);
    setError(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const requests: Promise<Response>[] = [];
      if (sku !== variant.sku || priceIDR !== initialPriceIDR) {
        requests.push(
          fetch("/api/admin/assets/variant", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              productId,
              variantId: variant.id,
              sku: sku !== variant.sku ? sku : undefined,
              price: priceIDR !== initialPriceIDR ? toShopifyPriceString(priceIDR) : undefined,
            }),
          })
        );
      }
      if (stock !== variant.inventoryQuantity) {
        requests.push(
          fetch("/api/admin/assets/stock", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ inventoryItemId: variant.inventoryItemId, quantity: stock }),
          })
        );
      }
      const results = await Promise.all(requests);
      for (const res of results) {
        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error ?? "Failed to save");
        }
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 1400);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <tr className={`border-t border-[#eee7d8] ${dirty ? "bg-[#fdf8f0]" : "hover:bg-white/60"}`}>
      <td className="px-5 py-2">
        <VariantThumbnail
          productId={productId}
          variantId={variant.id}
          imageUrl={variant.image?.url ?? null}
          onUploaded={() => router.refresh()}
        />
      </td>
      <td className="px-5 py-2 font-medium text-[#1c1c1a]">{comboLabel(variant)}</td>
      <td className="px-5 py-2">
        <input
          value={sku}
          disabled={saving}
          onChange={(e) => setSku(e.target.value)}
          className={`admin-input w-40 ${sku !== variant.sku ? "dirty" : ""}`}
        />
      </td>
      <td className="px-5 py-2">
        <div className={`admin-input-group w-24 ${priceIDR !== initialPriceIDR ? "dirty" : ""}`}>
          <span className="admin-input-prefix">{currencyCfg.symbol}</span>
          <input
            inputMode="decimal"
            disabled={saving}
            value={priceDisplay}
            onChange={(e) => {
              const sanitized = sanitizeAmountInput(e.target.value, currency);
              setPriceIDR(convertToIDR(parseAmountInput(sanitized, currency), currency));
            }}
            className="admin-input-bare"
          />
        </div>
      </td>
      <td className="px-5 py-2">
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min={0}
            disabled={saving}
            value={stock}
            onChange={(e) => setStock(Number(e.target.value))}
            className={`admin-input w-16 ${stock !== variant.inventoryQuantity ? "dirty" : ""}`}
          />
          {!dirty && stock <= 0 && (
            <span className="rounded-full bg-gradient-to-r from-[#c23f35] to-[#b5342c] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
              Out
            </span>
          )}
        </div>
      </td>
      <td className="px-5 py-2 text-right">
        {error && <span className="mr-2 text-[10px] text-[#b5342c]">{error}</span>}
        {saved && !dirty && <span className="text-[10px] text-[#0f3d34]">Saved</span>}
        {dirty && (
          <span className="flex items-center justify-end gap-2">
            <button disabled={saving} onClick={reset} className="text-[10px] text-[#6b6a63] hover:text-[#1c1c1a] disabled:opacity-50">
              Cancel
            </button>
            <button
              disabled={saving}
              onClick={save}
              className="rounded-full bg-gradient-to-r from-[#154a3f] to-[#0f3d34] px-2.5 py-1 text-[10px] font-medium text-white shadow-sm disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </span>
        )}
      </td>
    </tr>
  );
}
