"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AdminProduct } from "@/lib/admin/shopify-admin-data";
import VariantThumbnail from "./VariantThumbnail";

type Variant = AdminProduct["variants"][number];

export default function VariantRow({
  productId,
  variant,
  onSave,
  onDelete,
}: {
  productId: string;
  variant: Variant;
  onSave: (
    variant: Variant,
    fields: { name?: string; sku?: string; price?: string; stock?: number; swatchColor?: string | null }
  ) => Promise<void>;
  onDelete: (variantId: string) => Promise<void>;
}) {
  const router = useRouter();
  const [name, setName] = useState(variant.title);
  const [sku, setSku] = useState(variant.sku);
  const [price, setPrice] = useState(variant.price);
  const [stock, setStock] = useState(variant.inventoryQuantity);
  const [swatchColor, setSwatchColor] = useState(variant.swatchColor);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const dirty =
    name !== variant.title ||
    sku !== variant.sku ||
    price !== variant.price ||
    stock !== variant.inventoryQuantity ||
    swatchColor !== variant.swatchColor;

  function reset() {
    setName(variant.title);
    setSku(variant.sku);
    setPrice(variant.price);
    setStock(variant.inventoryQuantity);
    setSwatchColor(variant.swatchColor);
  }

  async function save() {
    setSaving(true);
    try {
      await onSave(variant, {
        name: name !== variant.title ? name : undefined,
        sku: sku !== variant.sku ? sku : undefined,
        price: price !== variant.price ? price : undefined,
        stock: stock !== variant.inventoryQuantity ? stock : undefined,
        swatchColor: swatchColor !== variant.swatchColor ? swatchColor : undefined,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1400);
    } catch {
      // error surfaced by parent
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      await onDelete(variant.id);
    } catch {
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }

  return (
    <tr
      className={`border-t border-[#f0ece0] transition-colors ${
        dirty ? "bg-[#fdf8f0]" : "hover:bg-[#faf9f6]"
      } ${deleting ? "opacity-40" : ""}`}
    >
      <td className="px-5 py-2.5">
        <VariantThumbnail
          productId={productId}
          variantId={variant.id}
          imageUrl={variant.image?.url ?? null}
          onUploaded={() => router.refresh()}
        />
      </td>
      <td className="px-5 py-2.5">
        <input
          value={name}
          disabled={saving || deleting}
          onChange={(e) => setName(e.target.value)}
          className={`admin-input w-32 ${name !== variant.title ? "dirty" : ""}`}
        />
      </td>
      <td className="px-5 py-2.5">
        <input
          value={sku}
          disabled={saving || deleting}
          onChange={(e) => setSku(e.target.value)}
          className={`admin-input w-32 ${sku !== variant.sku ? "dirty" : ""}`}
        />
      </td>
      <td className="px-5 py-2.5">
        <input
          value={price}
          disabled={saving || deleting}
          onChange={(e) => setPrice(e.target.value)}
          className={`admin-input w-24 ${price !== variant.price ? "dirty" : ""}`}
        />
      </td>
      <td className="px-5 py-2.5">
        <div className="flex items-center gap-1.5">
          <label
            className={`relative h-7 w-7 shrink-0 cursor-pointer rounded-full border transition-colors ${
              swatchColor !== variant.swatchColor ? "border-[#b1632f]" : "border-[#e8e3d8]"
            }`}
            style={{ backgroundColor: swatchColor ?? "transparent" }}
            title={swatchColor ?? "No swatch color set"}
          >
            {!swatchColor && (
              <span className="absolute inset-0 rounded-full bg-[repeating-linear-gradient(45deg,#e8e3d8,#e8e3d8_3px,transparent_3px,transparent_6px)]" />
            )}
            <input
              type="color"
              disabled={saving || deleting}
              value={swatchColor ?? "#cccccc"}
              onChange={(e) => setSwatchColor(e.target.value)}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </label>
          <input
            value={swatchColor ?? ""}
            disabled={saving || deleting}
            onChange={(e) => setSwatchColor(e.target.value || null)}
            placeholder="none"
            className={`admin-input w-20 ${swatchColor !== variant.swatchColor ? "dirty" : ""}`}
          />
        </div>
      </td>
      <td className="px-5 py-2.5">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            disabled={saving || deleting}
            value={stock}
            onChange={(e) => setStock(Number(e.target.value))}
            className={`admin-input w-20 ${stock !== variant.inventoryQuantity ? "dirty" : ""}`}
          />
          {!dirty && stock <= 0 && <span className="text-xs text-[#b5342c] font-medium">Out</span>}
          {!dirty && stock > 0 && stock <= 10 && <span className="text-xs text-[#b1632f] font-medium">Low</span>}
        </div>
      </td>
      <td className="px-5 py-2.5">
        <div className="flex items-center justify-end gap-3">
          {saved && !dirty && (
            <span className="flex items-center gap-1 text-xs text-[#0f3d34] animate-[popIn_0.2s_ease-out]">
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M16.704 5.29a1 1 0 010 1.415l-7.5 7.5a1 1 0 01-1.415 0l-3.5-3.5a1 1 0 111.415-1.415L8.5 12.086l6.79-6.796a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              Saved
            </span>
          )}

          {dirty && (
            <>
              <button
                disabled={saving}
                onClick={reset}
                className="text-xs text-[#6b6a63] hover:text-[#1c1c1a] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                disabled={saving}
                onClick={save}
                className="rounded-full bg-[#0f3d34] px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-[#0c332b] disabled:opacity-60 flex items-center gap-1.5"
              >
                {saving && (
                  <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                )}
                Save
              </button>
            </>
          )}

          {!dirty &&
            (confirmingDelete ? (
              <span className="flex items-center gap-2 animate-[fadeIn_0.15s_ease-out]">
                <span className="text-xs text-[#6b6a63]">Delete?</span>
                <button
                  disabled={deleting}
                  onClick={confirmDelete}
                  className="text-xs font-medium text-[#b5342c] hover:underline disabled:opacity-50"
                >
                  Yes
                </button>
                <button
                  disabled={deleting}
                  onClick={() => setConfirmingDelete(false)}
                  className="text-xs text-[#6b6a63] hover:underline disabled:opacity-50"
                >
                  No
                </button>
              </span>
            ) : (
              <button
                onClick={() => setConfirmingDelete(true)}
                className="text-xs text-[#a89a80] hover:text-[#b5342c] transition-colors"
              >
                Delete
              </button>
            ))}
        </div>
      </td>
    </tr>
  );
}
