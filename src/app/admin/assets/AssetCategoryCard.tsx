"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AdminProduct } from "@/lib/admin/shopify-admin-data";
import EditableTitle from "./EditableTitle";
import VariantRow from "./VariantRow";

export default function AssetCategoryCard({ product }: { product: AdminProduct }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

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
    fields: { name?: string; sku?: string; price?: string; stock?: number }
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
    refresh();
  }

  return (
    <div className="group/card rounded-xl border border-[#e8e3d8] bg-white overflow-hidden transition-shadow hover:shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b border-[#f0ece0] px-5 py-4">
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
                : "border-[#0f3d34] text-[#0f3d34] hover:bg-[#0f3d34] hover:text-white"
            }`}
          >
            {adding ? "Cancel" : "+ Add variant"}
          </button>
        )}
      </div>

      {error && (
        <p className="animate-[fadeIn_0.15s_ease-out] border-b border-[#f6dcd6] bg-[#fbe9e7] px-5 py-2 text-xs text-[#b5342c]">
          {error}
        </p>
      )}

      {adding && primaryOption && (
        <form
          action={addVariant}
          className="flex flex-wrap items-end gap-3 border-b border-[#f0ece0] bg-[#f7f5f0] px-5 py-4 animate-[fadeIn_0.15s_ease-out]"
        >
          <Field label={primaryOption.name}>
            <input name="value" required autoFocus className="admin-input" placeholder="e.g. Navy" />
          </Field>
          <Field label="Price">
            <input name="price" defaultValue="0.00" className="admin-input w-24" />
          </Field>
          <Field label="SKU">
            <input name="sku" className="admin-input w-32" />
          </Field>
          <button
            type="submit"
            className="rounded-full bg-[#0f3d34] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#0c332b]"
          >
            Add
          </button>
        </form>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#f2ece1] text-left text-xs text-[#6b6a63] uppercase tracking-wide">
            <th className="px-5 py-2.5 font-medium">Variant</th>
            <th className="px-5 py-2.5 font-medium">SKU</th>
            <th className="px-5 py-2.5 font-medium">Price</th>
            <th className="px-5 py-2.5 font-medium">Stock</th>
            <th className="px-5 py-2.5 font-medium" />
          </tr>
        </thead>
        <tbody>
          {product.variants.map((variant) => (
            <VariantRow key={variant.id} variant={variant} onSave={saveVariant} onDelete={removeVariant} />
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
