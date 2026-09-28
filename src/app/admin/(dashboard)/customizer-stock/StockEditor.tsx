"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, toast, useConfirm } from "./ui";

type Mode = "set" | "add" | "remove";

/** Amount box with + / − / Set; posts `{ ...target, quantity, mode }` and refreshes the page. */
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
  /** Asked in a dialog before a Set goes through. */
  confirmSet?: string;
}) {
  const router = useRouter();
  const { confirm, dialog } = useConfirm();
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState<Mode | null>(null);
  const [, startRefresh] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function send(mode: Mode) {
    const qty = Number(value);
    if (value.trim() === "" || !Number.isInteger(qty) || qty < (mode === "set" ? 0 : 1)) {
      return setError(mode === "set" ? "Whole number, 0 or more" : "Whole number, 1 or more");
    }
    if (mode === "set" && confirmSet && !(await confirm({ title: "Start tracking this variant?", body: confirmSet, confirmLabel: setLabel }))) return;
    setBusy(mode);
    setError(null);
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...target, quantity: qty, mode }),
    });
    if (!res.ok) {
      setBusy(null);
      return setError(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Couldn't save");
    }
    setValue("");
    toast(mode === "set" ? `Count set to ${qty}` : mode === "add" ? `Added ${qty}` : `Removed ${qty}`);
    // The spinner stays until the refreshed numbers are on screen.
    startRefresh(() => {
      router.refresh();
      setBusy(null);
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <input
          value={value}
          onChange={(e) => (setValue(e.target.value.replace(/\D/g, "")), setError(null))}
          inputMode="numeric"
          placeholder="Qty"
          aria-label="Amount"
          className={`h-8 w-16 rounded-lg border bg-white/80 px-2 text-sm tabular-nums shadow-inner outline-none transition-colors placeholder:text-[#b9b4a6] focus:border-[#0f3d34]/50 focus:ring-2 focus:ring-[#0f3d34]/10 ${
            error ? "border-[#b5342c]/50" : "border-[#d9d2c1]"
          }`}
        />
        <Button variant="success" disabled={!!busy || !canAdjust} loading={busy === "add"} onClick={() => send("add")} title="Add to what's left">
          + Add
        </Button>
        <Button variant="danger" disabled={!!busy || !canAdjust} loading={busy === "remove"} onClick={() => send("remove")} title="Remove from what's left">
          − Remove
        </Button>
        <Button disabled={!!busy} loading={busy === "set"} onClick={() => send("set")} title="Replace the count with this number">
          {setLabel}
        </Button>
      </div>
      {error && <span className="text-[11px] text-[#b5342c]">{error}</span>}
      {dialog}
    </div>
  );
}
