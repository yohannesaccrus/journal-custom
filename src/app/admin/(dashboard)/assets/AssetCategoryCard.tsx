"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AdminProduct, JournalSyncResult } from "@/lib/admin/shopify-admin-data";
import EditableTitle from "./EditableTitle";
import VariantRow from "./VariantRow";
import { useCurrency } from "../CurrencyContext";
import { CURRENCIES, convertToIDR, formatAmountInput, parseAmountInput, sanitizeAmountInput, toShopifyPriceString } from "@/lib/currency";

const PAGE_SIZE = 5;

/** Subsequence-based fuzzy match — every character of `query` must appear in
 * `target`, in order, with any gaps between them. Good enough for short
 * variant names/SKUs without pulling in a fuzzy-search dependency. */
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

export default function AssetCategoryCard({ product }: { product: AdminProduct }) {
  const router = useRouter();
  const { currency } = useCurrency();
  const currencyCfg = CURRENCIES[currency];
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newPriceInput, setNewPriceInput] = useState("0");
  const [submittingVariant, setSubmittingVariant] = useState(false);
  const [journalSync, setJournalSync] = useState<JournalSyncResult[] | null>(null);

  // String and Pen Holder colors also live as option values on all 8 sellable
  // journal cover products — adding one here needs to propagate there too, or
  // customers can never actually pick the new color.
  const syncsToJournal = product.tags.includes("string") || product.tags.includes("pen-holder");

  // Charm and cover catalogs can grow to dozens of variants — search + paginate
  // just those two instead of the whole assets page.
  const isPaginated = product.tags.includes("charm") || product.tags.includes("cover");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const filteredVariants = isPaginated
    ? product.variants.filter((v) => fuzzyMatch(query, `${v.title} ${v.sku}`))
    : product.variants;

  const totalPages = Math.max(1, Math.ceil(filteredVariants.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleVariants = isPaginated
    ? filteredVariants.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
    : filteredVariants;

  function handleQueryChange(value: string) {
    setQuery(value);
    setPage(1);
  }

  const primaryOption = product.options[0];

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function saveTitle(title: string) {
    setError(null);
    const res = await fetch("/api/admin/assets/product", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: product.id, title }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Failed to rename product");
      throw new Error(json.error);
    }
    refresh();
  }

  async function saveVariant(
    variant: AdminProduct["variants"][number],
    fields: { name?: string; sku?: string; price?: string; stock?: number; swatchColor?: string | null }
  ) {
    setError(null);
    const requests: Promise<Response>[] = [];

    if (fields.name !== undefined || fields.sku !== undefined || fields.price !== undefined) {
      const optionValueId = primaryOption?.optionValues.find(
        (v) => v.name === variant.selectedOptions[0]?.value
      )?.id;
      requests.push(
        fetch("/api/admin/assets/variant", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: product.id,
            variantId: variant.id,
            sku: fields.sku,
            price: fields.price,
            name: fields.name,
            previousName: fields.name !== undefined ? variant.title : undefined,
            productTags: product.tags,
            optionId: primaryOption?.id,
            optionValueId,
          }),
        })
      );
    }

    if (fields.stock !== undefined) {
      requests.push(
        fetch("/api/admin/assets/stock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inventoryItemId: variant.inventoryItemId, quantity: fields.stock }),
        })
      );
    }

    if (fields.swatchColor !== undefined) {
      requests.push(
        fetch("/api/admin/assets/swatch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ variantId: variant.id, hex: fields.swatchColor }),
        })
      );
    }

    const results = await Promise.all(requests);
    for (const res of results) {
      if (!res.ok) {
        const json = await res.json();
        setError(json.error ?? "Failed to save variant");
        throw new Error(json.error);
      }
    }
    refresh();
  }

  async function removeVariant(variantId: string) {
    setError(null);
    const res = await fetch("/api/admin/assets/variant", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: product.id, variantId }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Failed to delete variant");
      throw new Error(json.error);
    }
    refresh();
  }

  async function addVariant(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!primaryOption) return;
    const formData = new FormData(event.currentTarget);
    setError(null);
    setJournalSync(null);
    const value = String(formData.get("value") ?? "").trim();
    const price = String(formData.get("price") ?? "0.00").trim();
    const sku = String(formData.get("sku") ?? "").trim();
    if (!value) return;

    setSubmittingVariant(true);
    try {
      const res = await fetch("/api/admin/assets/variant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          optionId: primaryOption.id,
          optionName: primaryOption.name,
          value,
          price,
          sku,
          productTags: product.tags,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to add variant");
        return;
      }
      setAdding(false);
      setNewPriceInput("0");
      if (Array.isArray(json.journalSync) && json.journalSync.length > 0) {
        setJournalSync(json.journalSync);
      }
      refresh();
    } finally {
      setSubmittingVariant(false);
    }
  }

  return (
    <div className="group/card rounded-xl border border-white/70 bg-white/45 backdrop-blur-2xl ring-1 ring-inset ring-white/50 overflow-hidden shadow-[0_8px_30px_-14px_rgba(15,61,52,0.15)] transition-shadow hover:shadow-[0_12px_36px_-14px_rgba(15,61,52,0.22)]">
      <div className="flex items-center justify-between gap-4 border-b border-[#f0ece0]/80 bg-gradient-to-r from-white/40 to-transparent px-5 py-4">
        <div className="min-w-0">
          <EditableTitle value={product.title} onSave={saveTitle} />
          <p className="mt-0.5 text-xs text-[#a89a80]">
            {product.handle} · {product.status} · {product.tags.join(", ")}
          </p>
        </div>
        {primaryOption && (
          <button
            onClick={() => setAdding((v) => !v)}
            disabled={submittingVariant}
            className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-medium transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${
              adding
                ? "border-[#d8d5cb] text-[#6b6a63] hover:bg-[#f2ece1]"
                : "border-transparent bg-gradient-to-r from-[#154a3f] to-[#0f3d34] text-white shadow-sm hover:from-[#0f3d34] hover:to-[#0a2b25]"
            }`}
          >
            {adding ? "Cancel" : "+ Add variant"}
          </button>
        )}
      </div>

      {error && (
        <p className="animate-[fadeIn_0.15s_ease-out] border-b border-[#f6dcd6] bg-gradient-to-r from-[#fbe9e7] to-[#f8dcd8] px-5 py-2 text-xs text-[#b5342c]">
          {error}
        </p>
      )}

      {isPaginated && (
        <div className="flex items-center gap-2 border-b border-[#f0ece0]/80 bg-white/30 px-5 py-3">
          <svg
            className="h-4 w-4 shrink-0 text-[#a89a80]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
          </svg>
          <input
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Search by variant name or SKU…"
            className="w-full max-w-xs bg-transparent text-sm text-[#1c1c1a] placeholder:text-[#a89a80] focus:outline-none"
          />
          <span className="ml-auto shrink-0 text-xs text-[#a89a80]">
            {filteredVariants.length} variant{filteredVariants.length === 1 ? "" : "s"}
          </span>
        </div>
      )}

      {adding && primaryOption && (
        <form
          onSubmit={addVariant}
          className="border-b border-[#f0ece0] bg-gradient-to-r from-[#f7f5f0] to-[#f0ebe0] px-5 py-4 animate-[fadeIn_0.15s_ease-out]"
        >
          <div className="flex flex-wrap items-end gap-3">
            <Field label={primaryOption.name}>
              <input
                name="value"
                required
                autoFocus
                disabled={submittingVariant}
                className="admin-input disabled:opacity-50"
                placeholder="e.g. Navy"
              />
            </Field>
            <Field label={`Price (${currency})`}>
              <div className="admin-input-group w-28">
                <span className="admin-input-prefix">{currencyCfg.symbol}</span>
                <input
                  inputMode="decimal"
                  disabled={submittingVariant}
                  value={formatAmountInput(newPriceInput, currency)}
                  onChange={(e) => setNewPriceInput(sanitizeAmountInput(e.target.value, currency))}
                  className="admin-input-bare disabled:opacity-50"
                />
              </div>
              <input
                type="hidden"
                name="price"
                value={toShopifyPriceString(convertToIDR(parseAmountInput(newPriceInput, currency), currency))}
              />
            </Field>
            <Field label="SKU">
              <input name="sku" disabled={submittingVariant} className="admin-input w-32 disabled:opacity-50" />
            </Field>
            <button
              type="submit"
              disabled={submittingVariant}
              className="flex shrink-0 items-center gap-2 rounded-full bg-gradient-to-r from-[#154a3f] to-[#0f3d34] px-4 py-2 text-xs font-medium text-white shadow-sm transition-all hover:from-[#0f3d34] hover:to-[#0a2b25] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submittingVariant && (
                <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 shrink-0 animate-spin">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.3" />
                  <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              )}
              {submittingVariant ? (syncsToJournal ? "Generating…" : "Adding…") : "Add"}
            </button>
          </div>

          {syncsToJournal && (
            <p className="mt-3 flex items-start gap-1.5 text-xs text-[#8a6a3a]">
              <svg viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-3.5 w-3.5 shrink-0">
                <path d="M10 2a1 1 0 01.894.553l1.382 2.764 3.05.443a1 1 0 01.554 1.706l-2.207 2.152.521 3.038a1 1 0 01-1.451 1.054L10 12.202l-2.743 1.508a1 1 0 01-1.451-1.054l.521-3.038-2.207-2.152a1 1 0 01.554-1.706l3.05-.443L9.106 2.553A1 1 0 0110 2z" />
              </svg>
              {submittingVariant
                ? "Generating variants across all 8 covers — this can take several seconds…"
                : "This will also create matching variants for every color combination across all 8 cover products."}
            </p>
          )}
        </form>
      )}

      {journalSync && (
        <div className="animate-[fadeIn_0.15s_ease-out] border-b border-[#eae7de] bg-gradient-to-r from-[#f7f9f6] to-[#eef4ef] px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs font-medium text-[#1c1c1a]">
              Synced to {journalSync.filter((r) => r.created > 0).length}/{journalSync.length} covers
              {journalSync.some((r) => r.error) && (
                <span className="ml-1.5 text-[#b5342c]">
                  · {journalSync.filter((r) => r.error).length} failed
                </span>
              )}
              {journalSync.some((r) => r.skipped) && (
                <span className="ml-1.5 text-[#b1632f]">
                  · {journalSync.filter((r) => r.skipped).length} already had it
                </span>
              )}
            </p>
            <button
              type="button"
              onClick={() => setJournalSync(null)}
              className="shrink-0 text-xs text-[#a89a80] hover:text-[#1c1c1a]"
            >
              Dismiss
            </button>
          </div>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {journalSync.map((r) => (
              <li key={r.coverHandle} className="flex items-center gap-1.5 text-xs text-[#6b6a63]">
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    r.error ? "bg-[#b5342c]" : r.skipped ? "bg-[#b1632f]" : "bg-[#1f7a4d]"
                  }`}
                />
                {r.coverTitle}
                {r.error ? ` — ${r.error}` : r.skipped ? " — already exists" : ` — ${r.created} variants`}
              </li>
            ))}
          </ul>
          <p className="mt-2.5 text-[11px] text-[#a89a80]">
            New variants start at 0 stock — set opening stock for each cover directly in Shopify Admin.
          </p>
        </div>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gradient-to-r from-[#f2ece1] to-[#ece4d3] text-left text-xs text-[#6b6a63] uppercase tracking-wide">
            <th className="px-5 py-2.5 font-medium">Image</th>
            <th className="px-5 py-2.5 font-medium">Variant</th>
            <th className="px-5 py-2.5 font-medium">SKU</th>
            <th className="px-5 py-2.5 font-medium">Price ({currency})</th>
            <th className="px-5 py-2.5 font-medium">Swatch</th>
            <th className="px-5 py-2.5 font-medium">Stock</th>
            <th className="px-5 py-2.5 font-medium" />
          </tr>
        </thead>
        <tbody>
          {visibleVariants.map((variant) => (
            <VariantRow
              key={variant.id}
              productId={product.id}
              variant={variant}
              onSave={saveVariant}
              onDelete={removeVariant}
            />
          ))}
          {isPaginated && visibleVariants.length === 0 && (
            <tr>
              <td colSpan={7} className="px-5 py-8 text-center text-sm text-[#a89a80]">
                No variants match “{query}”.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {isPaginated && totalPages > 1 && (
        <div className="flex items-center justify-between gap-4 border-t border-[#f0ece0]/80 bg-white/30 px-5 py-3">
          <p className="text-xs text-[#a89a80]">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-full border border-[#d8d5cb] px-3 py-1 text-xs font-medium text-[#6b6a63] transition-colors hover:bg-[#f2ece1] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            >
              Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                className={`h-6 w-6 rounded-full text-xs font-medium transition-colors ${
                  p === currentPage
                    ? "bg-gradient-to-r from-[#154a3f] to-[#0f3d34] text-white shadow-sm"
                    : "text-[#6b6a63] hover:bg-[#f2ece1]"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded-full border border-[#d8d5cb] px-3 py-1 text-xs font-medium text-[#6b6a63] transition-colors hover:bg-[#f2ece1] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            >
              Next
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        .admin-input {
          border: 1px solid #d8d5cb;
          border-radius: 8px;
          padding: 0.375rem 0.625rem;
          font-size: 0.8125rem;
          background: white;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .admin-input:focus {
          outline: none;
          border-color: #0f3d34;
          box-shadow: 0 0 0 3px rgba(15, 61, 52, 0.08);
        }
        .admin-input.dirty {
          border-color: #b1632f;
          background: #fdf8f0;
        }
        /* Price fields — a "Rp" prefix baked into the input group, ready to
           swap for a live IDR/USD toggle later (see the currency switcher
           planned for the admin nav). */
        .admin-input-group {
          display: flex;
          align-items: center;
          border: 1px solid #d8d5cb;
          border-radius: 8px;
          background: white;
          transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
        }
        .admin-input-group:focus-within {
          border-color: #0f3d34;
          box-shadow: 0 0 0 3px rgba(15, 61, 52, 0.08);
        }
        .admin-input-group.dirty {
          border-color: #b1632f;
          background: #fdf8f0;
        }
        .admin-input-prefix {
          padding: 0.375rem 0 0.375rem 0.625rem;
          font-size: 0.8125rem;
          color: #a89a80;
          user-select: none;
        }
        .admin-input-bare {
          width: 100%;
          min-width: 0;
          border: none;
          background: transparent;
          padding: 0.375rem 0.625rem 0.375rem 0.25rem;
          font-size: 0.8125rem;
          color: inherit;
        }
        .admin-input-bare:focus {
          outline: none;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-2px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes popIn {
          0% {
            opacity: 0;
            transform: scale(0.85);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] text-[#6b6a63]">{label}</span>
      {children}
    </label>
  );
}
