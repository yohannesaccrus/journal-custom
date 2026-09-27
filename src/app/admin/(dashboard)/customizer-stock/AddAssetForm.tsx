"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Adds a new asset (a new cover, charm design...) to our tracked catalogue. This alone does not
 * make the storefront offer it -- whoever maintains the theme's sanaya-cz-catalog.liquid still
 * needs to add the same id there so shoppers can pick it.
 */
export function AddAssetForm({ kind, existingIds }: { kind: string; existingIds: string[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [id, setId] = useState("");
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (existingIds.includes(id.trim().toLowerCase())) return setError(`"${id}" already exists`);
    setSaving(true);
    setError(null);
    const res = await fetch("/api/admin/cz-catalog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, id, label }),
    });
    setSaving(false);
    if (!res.ok) return setError(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Couldn't add it");
    setId("");
    setLabel("");
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-3 text-xs font-medium text-[#0f3d34] underline">
        + Add a new one
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="mt-3 flex flex-wrap items-end gap-2 rounded-lg border border-[#d9d2c1] bg-white/60 p-3">
      <div>
        <label className="block text-xs text-[#6b6a63]">Id (matches the theme&apos;s catalogue)</label>
        <input
          value={id}
          onChange={(e) => setId(e.target.value)}
          placeholder="an-purple"
          required
          className="mt-1 w-36 rounded-md border border-[#d9d2c1] bg-white px-2 py-1 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs text-[#6b6a63]">Label</label>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Purple croc"
          required
          className="mt-1 w-40 rounded-md border border-[#d9d2c1] bg-white px-2 py-1 text-sm"
        />
      </div>
      <button type="submit" disabled={saving} className="rounded-md bg-[#0f3d34] px-3 py-1.5 text-xs text-white disabled:opacity-50">
        {saving ? "Adding…" : "Add"}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-[#d9d2c1] px-3 py-1.5 text-xs">
        Cancel
      </button>
      {error && <p className="w-full text-xs text-[#b5342c]">{error}</p>}
      <p className="w-full text-xs text-[#6b6a63]">
        This only starts tracking stock here. The storefront won&apos;t offer it until the same id is added to
        the theme&apos;s own catalogue (sanaya-cz-catalog.liquid) and its image file is uploaded there.
      </p>
    </form>
  );
}
