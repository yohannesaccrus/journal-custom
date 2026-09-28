"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, toast } from "./ui";

/**
 * Adds a new asset (a new cover, charm design...) to our tracked catalogue. This alone does not
 * make the storefront offer it -- whoever maintains the theme's sanaya-cz-catalog.liquid still
 * needs to add the same id there so shoppers can pick it.
 */
export function AddAssetForm({ kind, group, existingIds }: { kind: string; group: string | null; existingIds: string[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [id, setId] = useState("");
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [, startRefresh] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (existingIds.includes(id.trim().toLowerCase())) return setError(`"${id}" already exists`);
    setSaving(true);
    setError(null);
    const res = await fetch("/api/admin/cz-catalog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, id, label, group: group ?? undefined }),
    });
    if (!res.ok) {
      setSaving(false);
      return setError(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Couldn't add it");
    }
    toast(`Added "${label}"`);
    startRefresh(() => {
      router.refresh();
      setId("");
      setLabel("");
      setOpen(false);
      setSaving(false);
    });
  }

  if (!open) {
    return (
      <Button variant="ghost" onClick={() => setOpen(true)} className="-ml-2">
        <span className="text-sm leading-none">+</span> Add a new one
      </Button>
    );
  }

  const input =
    "mt-1 h-8 rounded-lg border border-[#d9d2c1] bg-white/90 px-2.5 text-sm shadow-inner outline-none transition-colors placeholder:text-[#b9b4a6] focus:border-[#0f3d34]/50 focus:ring-2 focus:ring-[#0f3d34]/10";
  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3 rounded-xl border border-[#0f3d34]/15 bg-gradient-to-br from-white/80 to-[#f2ece1]/60 p-4">
      <label className="block">
        <span className="text-[11px] font-medium uppercase tracking-wide text-[#6b6a63]">Id</span>
        <input value={id} onChange={(e) => setId(e.target.value)} placeholder="an-purple" required className={`${input} block w-36`} />
      </label>
      <label className="block">
        <span className="text-[11px] font-medium uppercase tracking-wide text-[#6b6a63]">Label</span>
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Purple croc" required className={`${input} block w-44`} />
      </label>
      {group && <span className="self-center rounded-full bg-[#0f3d34]/[0.07] px-2 py-1 text-[11px] font-medium text-[#0f3d34]">{group}</span>}
      <div className="flex gap-2">
        <Button type="submit" loading={saving} className="h-8">
          Add
        </Button>
        <Button variant="secondary" disabled={saving} onClick={() => setOpen(false)} className="h-8">
          Cancel
        </Button>
      </div>
      {error && <p className="w-full text-xs text-[#b5342c]">{error}</p>}
      <p className="w-full text-xs leading-relaxed text-[#6b6a63]">
        The id must match the theme&apos;s catalogue. This only starts tracking stock here: the storefront won&apos;t
        offer it until the same id is added to <code className="rounded bg-[#0f3d34]/[0.06] px-1">sanaya-cz-catalog.liquid</code> and
        its image is uploaded.
      </p>
    </form>
  );
}
