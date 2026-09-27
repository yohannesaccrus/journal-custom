"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "set" | "add" | "remove";

/** Amount box with Set / + / − buttons; posts `{ ...target, quantity, mode }` and refreshes the page. */
export function StockEditor({
  endpoint,
  target,
  initial,
  canAdjust,
  setLabel = "Set",
  confirmSet,
}: {
  endpoint: string;
  target: Record<string, string>;
  initial: string;
  /** Add/remove need an existing count to work from. */
  canAdjust: boolean;
  setLabel?: string;
  confirmSet?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState<Mode | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function send(mode: Mode) {
    const qty = Number(value);
    if (value.trim() === "" || !Number.isInteger(qty) || qty < (mode === "set" ? 0 : 1)) {
      return setError(mode === "set" ? "Whole number, 0 or more" : "Whole number, 1 or more");
    }
    if (mode === "set" && confirmSet && !window.confirm(confirmSet)) return;
    setBusy(mode);
    setError(null);
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...target, quantity: qty, mode }),
    });
    setBusy(null);
    if (!res.ok) return setError(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Couldn't save");
    if (mode !== "set") setValue("");
    router.refresh();
  }

  const btn = "rounded-md px-2 py-1 text-xs text-white disabled:opacity-40";
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        inputMode="numeric"
        aria-label="Amount"
        className="w-16 rounded-md border border-[#d9d2c1] bg-white/70 px-2 py-1 text-sm tabular-nums"
      />
      <button type="button" disabled={!!busy || !canAdjust} onClick={() => send("add")} className={`${btn} bg-[#2f7a63]`} title="Add to what's left">
        {busy === "add" ? "…" : "+ Add"}
      </button>
      <button type="button" disabled={!!busy || !canAdjust} onClick={() => send("remove")} className={`${btn} bg-[#b1632f]`} title="Remove from what's left">
        {busy === "remove" ? "…" : "− Remove"}
      </button>
      <button type="button" disabled={!!busy} onClick={() => send("set")} className={`${btn} bg-[#0f3d34]`} title="Replace the count with this number">
        {busy === "set" ? "…" : setLabel}
      </button>
      {error && <span className="w-full text-xs text-[#b5342c]">{error}</span>}
    </div>
  );
}
