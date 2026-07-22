"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AdminProduct } from "@/lib/admin/shopify-admin-data";
import EditableTitle from "./EditableTitle";
import VariantRow from "./VariantRow";
import { useCurrency } from "../CurrencyContext";
import { CURRENCIES, convertToIDR, formatAmountInput, parseAmountInput, sanitizeAmountInput, toShopifyPriceString } from "@/lib/currency";

export default function AssetCategoryCard({ product }: { product: AdminProduct }) {
  const router = useRouter();
  const { currency } = useCurrency();
  const currencyCfg = CURRENCIES[currency];
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newPriceInput, setNewPriceInput] = useState("0");

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

  async function addVariant(formData: FormData) {
    if (!primaryOption) return;
    setError(null);
    const value = String(formData.get("value") ?? "").trim();
    const price = String(formData.get("price") ?? "0.00").trim();
    const sku = String(formData.get("sku") ?? "").trim();
    if (!value) return;

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
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Failed to add variant");
      return;
    }
    setAdding(false);
    setNewPriceInput("0");
    refresh();
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
            className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-medium transition-all duration-150 ${
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

      {adding && primaryOption && (
        <form
          action={addVariant}
          className="flex flex-wrap items-end gap-3 border-b border-[#f0ece0] bg-gradient-to-r from-[#f7f5f0] to-[#f0ebe0] px-5 py-4 animate-[fadeIn_0.15s_ease-out]"
        >
          <Field label={primaryOption.name}>
            <input name="value" required autoFocus className="admin-input" placeholder="e.g. Navy" />
          </Field>
          <Field label={`Price (${currency})`}>
            <div className="admin-input-group w-28">
              <span className="admin-input-prefix">{currencyCfg.symbol}</span>
              <input
                inputMode="decimal"
                value={formatAmountInput(newPriceInput, currency)}
                onChange={(e) => setNewPriceInput(sanitizeAmountInput(e.target.value, currency))}
                className="admin-input-bare"
              />
            </div>
            <input
              type="hidden"
              name="price"
              value={toShopifyPriceString(convertToIDR(parseAmountInput(newPriceInput, currency), currency))}
            />
          </Field>
          <Field label="SKU">
            <input name="sku" className="admin-input w-32" />
          </Field>
          <button
            type="submit"
            className="rounded-full bg-gradient-to-r from-[#154a3f] to-[#0f3d34] px-4 py-2 text-xs font-medium text-white shadow-sm transition-all hover:from-[#0f3d34] hover:to-[#0a2b25]"
          >
            Add
          </button>
        </form>
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
          {product.variants.map((variant) => (
            <VariantRow
              key={variant.id}
              productId={product.id}
              variant={variant}
              onSave={saveVariant}
              onDelete={removeVariant}
            />
          ))}
        </tbody>
      </table>

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
