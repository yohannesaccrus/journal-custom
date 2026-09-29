"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Button, Spinner, toast, useConfirm } from "./ui";

export interface CzImage {
  fileId: string;
  url: string;
  width: number;
  height: number;
}

/** How a section adds assets: what kind, which group new ones get, and what the form needs. */
export interface CzAssetFormConfig {
  kind: string;
  /** Group new assets get from this section (a charm table's size), or null to choose. */
  group: string | null;
  /** Whether the storefront customizer can offer new ones of this kind. */
  storefront: boolean;
  /** Built-in covers a new cover can borrow string/charm positions from. */
  coverOptions: { id: string; label: string }[];
  /** Suggested id for a new one (the next charm number). */
  nextId: string;
}

export interface CzAssetValues {
  id: string;
  label: string;
  group: string;
  hex: string;
  ci: string;
  positionedLike: string;
  image: CzImage | null;
  spine: CzImage | null;
}

const KIND_NAME: Record<string, string> = {
  cover: "cover",
  string: "string",
  charm: "charm",
  patch: "patch",
  notebook: "notebook",
  corner: "metal corner",
  pen: "pen holder colour",
};

const errorOf = async (res: Response, fallback: string) =>
  ((await res.json().catch(() => ({}))) as { error?: string }).error ?? fallback;

async function api(body: unknown) {
  const res = await fetch("/api/admin/cz-files", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(await errorOf(res, "Upload failed"));
  return res.json();
}

/** Browser -> Shopify staged upload -> file in Shopify Files. */
async function uploadImage(file: File, name: string, alt: string): Promise<CzImage> {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const filename = `${name}-${Date.now().toString(36)}.${ext}`;
  const target = (await api({ action: "stage", filename, mimeType: file.type, size: file.size })) as {
    url: string;
    resourceUrl: string;
    parameters: { name: string; value: string }[];
  };
  const fd = new FormData();
  for (const p of target.parameters) fd.append(p.name, p.value);
  fd.append("file", file);
  const up = await fetch(target.url, { method: "POST", body: fd });
  if (!up.ok) throw new Error("Upload to Shopify failed");
  return (await api({ action: "create", resourceUrl: target.resourceUrl, filename, alt })) as CzImage;
}

const thumb = (url: string, w: number) => `${url}${url.includes("?") ? "&" : "?"}width=${w}`;

function ImageField({
  label,
  hint,
  value,
  onChange,
  onUploaded,
  name,
  alt,
  required,
}: {
  label: string;
  hint: string;
  value: CzImage | null;
  onChange: (img: CzImage | null) => void;
  onUploaded: (fileId: string) => void;
  name: string;
  alt: string;
  required?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const img = await uploadImage(file, name, alt);
      onUploaded(img.fileId);
      onChange(img);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <FieldLabel required={required}>{label}</FieldLabel>
      <div className="mt-1 flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-[#0f3d34]/30 bg-white/80 text-[#6b6a63] transition-colors hover:border-[#b1632f] hover:text-[#b1632f]"
          aria-label={value ? `Replace ${label}` : `Upload ${label}`}
        >
          {value && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumb(value.url, 160)} alt="" className="h-full w-full object-contain" />
          )}
          {!value && !busy && <span className="text-2xl leading-none">+</span>}
          {busy && (
            <span className="absolute inset-0 flex items-center justify-center bg-white/70">
              <Spinner className="h-5 w-5 text-[#0f3d34]" />
            </span>
          )}
        </button>
        <div className="min-w-0 text-[11px] leading-snug text-[#6b6a63]">
          <p>{hint}</p>
          {value && (
            <p className="mt-1 tabular-nums text-[#8a877c]">
              {value.width} × {value.height}px ·{" "}
              <button type="button" onClick={() => inputRef.current?.click()} className="font-medium text-[#0f3d34] underline">
                Replace
              </button>
            </p>
          )}
          {error && <p className="mt-1 text-[#b5342c]">{error}</p>}
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={(e) => pick(e.target.files?.[0])} />
    </div>
  );
}

function FieldLabel({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <span className="block text-[11px] font-semibold uppercase tracking-wide text-[#6b6a63]">
      {children}
      {required && <span className="text-[#b1632f]"> *</span>}
    </span>
  );
}

const INPUT =
  "mt-1 block h-9 w-full rounded-lg border border-[#d9d2c1] bg-white/90 px-2.5 text-sm shadow-inner outline-none transition-colors placeholder:text-[#b9b4a6] focus:border-[#0f3d34]/50 focus:ring-2 focus:ring-[#0f3d34]/10 disabled:bg-[#f2ece1]/60 disabled:text-[#6b6a63]";

function AssetDialog({
  form,
  assetKey,
  initial,
  existingIds,
  onClose,
}: {
  form: CzAssetFormConfig;
  assetKey?: string;
  initial?: CzAssetValues;
  existingIds: string[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [, startRefresh] = useTransition();
  const editing = !!assetKey;
  const kind = form.kind;
  const [v, setV] = useState<CzAssetValues>(
    initial ?? {
      id: form.nextId,
      label: kind === "charm" && form.nextId ? `Charm ${form.nextId}` : "",
      group: form.group ?? (kind === "cover" ? "Classic leather" : ""),
      hex: kind === "string" ? "#888888" : "",
      ci: "",
      positionedLike: form.coverOptions[0]?.id ?? "",
      image: null,
      spine: null,
    }
  );
  const set = <K extends keyof CzAssetValues>(k: K, val: CzAssetValues[K]) => setV((x) => ({ ...x, [k]: val }));
  const uploaded = useRef<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Uploads that didn't end up on the saved asset (cancelled, or replaced before saving).
  const discard = (keep: (string | undefined)[]) => {
    const ids = uploaded.current.filter((id) => !keep.includes(id));
    if (ids.length) void api({ action: "discard", fileIds: ids }).catch(() => {});
    uploaded.current = [];
  };
  const cancel = () => {
    discard([initial?.image?.fileId, initial?.spine?.fileId]);
    onClose();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !saving && cancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing && existingIds.includes(v.id.trim().toLowerCase())) return setError(`"${v.id}" already exists`);
    setSaving(true);
    setError(null);
    const res = await fetch("/api/admin/cz-catalog", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: assetKey,
        kind,
        id: v.id,
        label: v.label,
        group: v.group || undefined,
        hex: v.hex || undefined,
        ci: v.ci || undefined,
        positionedLike: v.positionedLike || undefined,
        image: v.image ?? undefined,
        spine: v.spine ?? undefined,
      }),
    });
    if (!res.ok) {
      setSaving(false);
      return setError(await errorOf(res, "Couldn't save"));
    }
    discard([v.image?.fileId, v.spine?.fileId]);
    toast(editing ? `Saved "${v.label}"` : `Added "${v.label}"`);
    startRefresh(() => {
      router.refresh();
      onClose();
    });
  }

  const name = `cz-${kind}-${(v.id || "new").toLowerCase().replace(/[^a-z0-9-]/g, "")}`;
  const onUploaded = (id: string) => uploaded.current.push(id);
  const title = `${editing ? "Edit" : "Add a new"} ${KIND_NAME[kind] ?? kind}`;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close" onClick={() => !saving && cancel()} className="absolute inset-0 bg-[#0a2b25]/45 backdrop-blur-sm" />
      <form
        onSubmit={save}
        className="relative flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-[#faf8f3] shadow-[0_30px_80px_-20px_rgba(10,43,37,0.6)] ring-1 ring-black/5"
      >
        <div className="relative overflow-hidden bg-gradient-to-br from-[#154a3f] via-[#0f3d34] to-[#0a2b25] px-5 py-4">
          <div className="pointer-events-none absolute -top-10 -right-6 h-28 w-28 rounded-full bg-[#b1632f]/35 blur-[40px]" />
          <h3 className="relative font-serif text-lg text-[#f2ece1]">{title}</h3>
          <p className="relative mt-0.5 text-xs text-[#f2ece1]/70">
            {form.storefront
              ? "Once saved it's tracked here and offered in the customizer (after the theme update)."
              : "Tracked here only: the customizer has no room for new ones of this kind."}
          </p>
        </div>

        <div className="grid gap-4 overflow-y-auto px-5 py-5 sm:grid-cols-2">
          <label className="block">
            <FieldLabel required>{kind === "charm" ? "Number" : "Id"}</FieldLabel>
            <input
              value={v.id}
              onChange={(e) => set("id", e.target.value)}
              disabled={editing}
              required
              inputMode={kind === "charm" ? "numeric" : undefined}
              placeholder={kind === "charm" ? "89" : kind === "cover" ? "an-purple" : "purple-heart"}
              className={INPUT}
            />
            <span className="mt-1 block text-[10.5px] text-[#8a877c]">
              {editing ? "Can't change once added." : kind === "charm" ? "Charm number shown on orders." : "Lowercase, hyphens. Can't change later."}
            </span>
          </label>
          <label className="block">
            <FieldLabel required>Label</FieldLabel>
            <input value={v.label} onChange={(e) => set("label", e.target.value)} required placeholder="Purple croc" className={INPUT} />
            <span className="mt-1 block text-[10.5px] text-[#8a877c]">Shown in the customizer and on orders.</span>
          </label>

          {kind === "cover" && (
            <>
              <label className="block">
                <FieldLabel required>Leather</FieldLabel>
                <select value={v.group} onChange={(e) => set("group", e.target.value)} className={INPUT}>
                  <option>Classic leather</option>
                  <option>Animal print</option>
                </select>
                <span className="mt-1 block text-[10.5px] text-[#8a877c]">Sets the price: classic, or classic + animal upgrade.</span>
              </label>
              <label className="block">
                <FieldLabel required>Positioned like</FieldLabel>
                <select value={v.positionedLike} onChange={(e) => set("positionedLike", e.target.value)} className={INPUT}>
                  {form.coverOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <span className="mt-1 block text-[10.5px] text-[#8a877c]">Borrows where the string and charms sit. Shoot the photos the same way.</span>
              </label>
              <label className="block sm:col-span-2">
                <FieldLabel>Name on orders</FieldLabel>
                <input value={v.ci} onChange={(e) => set("ci", e.target.value)} placeholder={v.label || "Purple crocodile"} className={INPUT} />
                <span className="mt-1 block text-[10.5px] text-[#8a877c]">Optional, e.g. &ldquo;Purple crocodile&rdquo;. Defaults to the label.</span>
              </label>
              <ImageField
                label="Front photo"
                hint="Same framing as the other covers' front photos."
                value={v.image}
                onChange={(img) => set("image", img)}
                onUploaded={onUploaded}
                name={`${name}-face`}
                alt={`${v.label} cover, front`}
                required
              />
              <ImageField
                label="Spine photo"
                hint="Same framing as the other covers' spine photos."
                value={v.spine}
                onChange={(img) => set("spine", img)}
                onUploaded={onUploaded}
                name={`${name}-spine`}
                alt={`${v.label} cover, spine`}
                required
              />
            </>
          )}

          {kind === "charm" && (
            <>
              <label className="block">
                <FieldLabel required>Size</FieldLabel>
                <select value={v.group} onChange={(e) => set("group", e.target.value)} className={INPUT}>
                  <option>Size S</option>
                  <option>Size M</option>
                  <option>Size L</option>
                </select>
                <span className="mt-1 block text-[10.5px] text-[#8a877c]">Sets the price and which table it&apos;s in.</span>
              </label>
              <ImageField
                label="Photo"
                hint="Cut out on a transparent background, cropped tight to the charm: its shape sets how wide it's drawn."
                value={v.image}
                onChange={(img) => set("image", img)}
                onUploaded={onUploaded}
                name={name}
                alt={v.label}
                required
              />
            </>
          )}

          {kind === "patch" && (
            <ImageField
              label="Photo"
              hint="Square, like the other patches."
              value={v.image}
              onChange={(img) => set("image", img)}
              onUploaded={onUploaded}
              name={name}
              alt={v.label}
              required
            />
          )}

          {kind === "string" && (
            <>
              <label className="block">
                <FieldLabel required>Colour</FieldLabel>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="color"
                    value={/^#[0-9a-f]{6}$/i.test(v.hex) ? v.hex : "#888888"}
                    onChange={(e) => set("hex", e.target.value)}
                    className="h-9 w-12 cursor-pointer rounded-lg border border-[#d9d2c1] bg-white p-1"
                    aria-label="Pick colour"
                  />
                  <input value={v.hex} onChange={(e) => set("hex", e.target.value)} placeholder="#b3a4d6" className={`${INPUT} mt-0`} />
                </div>
                <span className="mt-1 block text-[10.5px] text-[#8a877c]">The customizer draws the string in this colour.</span>
              </label>
              <ImageField
                label="Thumbnail"
                hint="Optional, only for this dashboard."
                value={v.image}
                onChange={(img) => set("image", img)}
                onUploaded={onUploaded}
                name={name}
                alt={v.label}
              />
            </>
          )}

          {!form.storefront && (
            <ImageField
              label="Thumbnail"
              hint="Optional, only for this dashboard."
              value={v.image}
              onChange={(img) => set("image", img)}
              onUploaded={onUploaded}
              name={name}
              alt={v.label}
            />
          )}

          <div className="rounded-lg bg-[#0f3d34]/[0.05] px-3 py-2 text-[11px] leading-relaxed text-[#3d3c37] sm:col-span-2">
            <strong className="text-[#1c1c1a]">Price:</strong>{" "}
            {kind === "cover"
              ? "classic leather, or classic + animal upgrade, from the Pricing panel."
              : kind === "charm"
                ? "the Pricing panel's price for its size."
                : kind === "corner" || kind === "pen"
                  ? "the Pricing panel's price."
                  : "included with the journal."}{" "}
            Photos are stored in Shopify Files.
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[#e6e0d2] bg-white/50 px-5 py-3">
          {error && <p className="mr-auto text-xs text-[#b5342c]">{error}</p>}
          <Button variant="secondary" disabled={saving} onClick={cancel}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {editing ? "Save changes" : "Add"}
          </Button>
        </div>
      </form>
    </div>,
    document.body
  );
}

/** "+ Add a new one" above a section's table. */
export function AddAssetButton({ form, existingIds }: { form: CzAssetFormConfig; existingIds: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)} className="-ml-2">
        <span className="text-sm leading-none">+</span> Add a new one
      </Button>
      {open && <AssetDialog form={form} existingIds={existingIds} onClose={() => setOpen(false)} />}
    </>
  );
}

/** Edit / Delete under an asset that was added from the admin. */
export function AssetActions({ form, assetKey, values }: { form: CzAssetFormConfig; assetKey: string; values: CzAssetValues }) {
  const router = useRouter();
  const [, startRefresh] = useTransition();
  const { confirm, dialog } = useConfirm();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  async function remove() {
    const ok = await confirm({
      title: `Delete "${values.label}"?`,
      confirmLabel: "Delete",
      body: (
        <div className="space-y-2">
          <p>It disappears from this dashboard and from the customizer, its photos are deleted from Shopify Files, and its stock count is dropped.</p>
          <p className="text-[#7a4520]">Orders that already used it keep their details.</p>
        </div>
      ),
    });
    if (!ok) return;
    setBusy(true);
    const res = await fetch("/api/admin/cz-catalog", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: assetKey }) });
    if (!res.ok) {
      setBusy(false);
      return toast(await errorOf(res, "Couldn't delete"), "error");
    }
    toast(`Deleted "${values.label}"`);
    startRefresh(() => {
      router.refresh();
      setBusy(false);
    });
  }

  return (
    <span className="mt-0.5 flex items-center gap-2 text-[11px]">
      <span className="rounded-full bg-[#b1632f]/12 px-1.5 py-px font-medium text-[#8a4a22]">Added</span>
      <button type="button" onClick={() => setEditing(true)} disabled={busy} className="font-medium text-[#0f3d34] hover:underline">
        Edit
      </button>
      <button type="button" onClick={remove} disabled={busy} className="inline-flex items-center gap-1 font-medium text-[#9a2a23] hover:underline">
        {busy && <Spinner className="h-3 w-3" />}Delete
      </button>
      {editing && <AssetDialog form={form} assetKey={assetKey} initial={values} existingIds={[]} onClose={() => setEditing(false)} />}
      {dialog}
    </span>
  );
}
