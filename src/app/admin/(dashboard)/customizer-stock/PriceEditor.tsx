"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/markets";
import type { CzPrice, CzPriceKey } from "@/lib/admin/cz-stock";
import { ShopPrice } from "./ShopPrice";
import { Button, Notice, toast, useConfirm } from "./ui";

export interface CzPriceEdit {
  /** The Shopify product whose price this is. */
  key: CzPriceKey;
  /** Which assets share the product, and so change too, e.g. "every classic cover". */
  scope: string | null;
}

async function post(body: unknown): Promise<string | null> {
  const res = await fetch("/api/admin/cz-price", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return res.ok ? null : (((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Couldn't save");
}

/**
 * A price that can be edited in IDR (what the storefront customizer shows), used by the pricing
 * panels. Saving sets the product's price for Indonesia and moves every other market by the same ratio.
 */
export function PriceEditor({ price, edit, enabled }: { price: CzPrice; edit: CzPriceEdit | null; enabled: boolean }) {
  const router = useRouter();
  const { confirm, dialog } = useConfirm();
  const [value, setValue] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [, startRefresh] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!edit || !enabled || price.idr == null) return <ShopPrice price={price} />;
  const current = price.idr;

  async function save() {
    const total = Number((value ?? "").replace(/\D/g, ""));
    if (!total) return setError("Enter a price");
    if (total === current) return setValue(null);
    const change = ((total - current) / current) * 100;
    const ok = await confirm({
      title: "Change this price?",
      confirmLabel: "Save price",
      body: (
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-xl bg-white/80 px-4 py-3 ring-1 ring-[#e6e0d2]">
            <span className="tabular-nums text-[#6b6a63] line-through decoration-[#b1632f]/60">{formatMoney(current, "IDR")}</span>
            <span className="text-[#b1632f]">→</span>
            <span className="font-serif text-lg tabular-nums text-[#0f3d34]">{formatMoney(total, "IDR")}</span>
            <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums ${change > 0 ? "bg-[#2f7a63]/10 text-[#22604d]" : "bg-[#b5342c]/10 text-[#9a2a23]"}`}>
              {change > 0 ? "+" : ""}
              {change.toFixed(2)}%
            </span>
          </div>
          <p>
            Indonesia gets exactly this price. Every other market moves by the same percentage, so their prices stay in
            line with it.
          </p>
          {edit!.scope && <p className="text-[#7a4520]">This changes {edit!.scope}.</p>}
          {Math.abs(change) >= 50 && (
            <p className="rounded-lg bg-[#b5342c]/[0.08] px-3 py-2 font-medium text-[#9a2a23]">
              That&apos;s a {change > 0 ? "rise" : "drop"} of {Math.abs(change).toFixed(0)}%. Check the amount is right.
            </p>
          )}
        </div>
      ),
    });
    if (!ok) return;
    setBusy(true);
    setError(null);
    const err = await post({ key: edit!.key, idr: total });
    if (err) {
      setBusy(false);
      return setError(err);
    }
    toast(`Price updated to ${formatMoney(total, "IDR")}`);
    startRefresh(() => {
      router.refresh();
      setValue(null);
      setBusy(false);
    });
  }

  if (value == null) {
    return (
      <span className="inline-flex flex-wrap items-center gap-3">
        <ShopPrice price={price} />
        <Button variant="secondary" onClick={() => setValue(String(current))} className="font-sans" title="Edit this price (in IDR)">
          <svg className="h-3.5 w-3.5 text-[#b1632f]" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
          </svg>
          Edit price
        </Button>
      </span>
    );
  }
  return (
    <div className="flex flex-col gap-1 font-sans text-sm">
      <div className="flex items-center gap-1.5">
        <div className="flex h-8 items-center overflow-hidden rounded-lg border border-[#0f3d34]/40 bg-white shadow-inner ring-2 ring-[#0f3d34]/10">
          <span className="h-full border-r border-[#e6e0d2] bg-[#f7f5f0] px-2 text-xs leading-8 text-[#6b6a63]">Rp</span>
          <input
            value={Number(value.replace(/\D/g, "") || 0).toLocaleString("id-ID")}
            onChange={(e) => (setValue(e.target.value.replace(/\D/g, "")), setError(null))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                save();
              }
              if (e.key === "Escape") setValue(null);
            }}
            onFocus={(e) => e.currentTarget.select()}
            inputMode="numeric"
            aria-label="Price in IDR"
            autoFocus
            disabled={busy}
            className="h-full w-28 px-2 text-sm tabular-nums outline-none"
          />
        </div>
        <Button loading={busy} onClick={save}>
          Save
        </Button>
        <Button variant="ghost" disabled={busy} onClick={() => (setValue(null), setError(null))}>
          Cancel
        </Button>
      </div>
      {edit.scope && !error && <span className="text-[11px] text-[#6b6a63]">Changes {edit.scope}</span>}
      {error && <span className="text-[11px] text-[#b5342c]">{error}</span>}
      {dialog}
    </div>
  );
}

/** Shown when prices can't be edited yet: the IDR price list is missing, or Shopify refused to say. */
export function PriceSetupNotice({ problem }: { problem: "missing" | string }) {
  const router = useRouter();
  const { confirm, dialog } = useConfirm();
  const [busy, setBusy] = useState(false);
  const [, startRefresh] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function setup() {
    const ok = await confirm({
      title: "Set up IDR pricing?",
      confirmLabel: "Set up",
      body: "This creates an IDR price list for Indonesia's market in Shopify. No price changes until you save one.",
    });
    if (!ok) return;
    setBusy(true);
    setError(null);
    const err = await post({ action: "setup" });
    if (err) {
      setBusy(false);
      return setError(err);
    }
    toast("IDR pricing is set up");
    startRefresh(() => {
      router.refresh();
      setBusy(false);
    });
  }

  return (
    <>
      <Notice
        tone="warning"
        action={
          problem === "missing" && (
            <Button loading={busy} onClick={setup}>
              Set up IDR pricing
            </Button>
          )
        }
      >
        {problem === "missing"
          ? "Prices can't be edited yet: Shopify has no IDR price list for Indonesia, so its prices are converted automatically."
          : `Prices can't be edited: ${problem}`}
        {error && <p className="mt-1 text-[#9a2a23]">{error}</p>}
      </Notice>
      {dialog}
    </>
  );
}

