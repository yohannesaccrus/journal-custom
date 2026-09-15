"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CURRENCIES, formatAmountInput, sanitizeAmountInput } from "@/lib/currency";
import { useCurrency } from "./CurrencyContext";

/**
 * Floating, fixed top-right — deliberately styled apart from the rest of the
 * UI (dark pill, brand-orange accents) so it reads as an admin-only modifier
 * rather than part of the page content, and stays put across scrolling on
 * every admin page. A custom listbox instead of a native <select> since the
 * native option popup can't be themed (no gradient/blur/rounding on it).
 */
export function CurrencySwitcher() {
  const { currency, setCurrency } = useCurrency();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const active = CURRENCIES[currency];
  const router = useRouter();

  const [editingRate, setEditingRate] = useState(false);
  const [rateInput, setRateInput] = useState(() => String(Math.round(CURRENCIES.IDR.rateFromEUR)));
  const [savingRate, setSavingRate] = useState(false);
  const [rateError, setRateError] = useState<string | null>(null);

  async function saveRate() {
    const parsed = Number(rateInput.replace(/\./g, "").replace(/,/g, ""));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setRateError("Enter a positive number");
      return;
    }
    setSavingRate(true);
    setRateError(null);
    try {
      const res = await fetch("/api/admin/settings/exchange-rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rate: parsed }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Failed to save");
      setEditingRate(false);
      router.refresh();
    } catch (err) {
      setRateError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSavingRate(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-full border border-[#b1632f]/40 bg-[#1c1c1a]/85 pl-3 pr-1.5 py-1.5 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)] backdrop-blur-xl ring-1 ring-inset ring-white/10"
    >
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#e0a870]">Currency</span>

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="flex items-center gap-1.5 rounded-full border border-white/10 bg-gradient-to-r from-[#b1632f] to-[#9c5426] py-1 pl-3 pr-2.5 text-xs font-semibold text-white shadow-inner transition-colors hover:from-[#c17038] hover:to-[#b1632f] focus:outline-none focus:ring-2 focus:ring-[#e0a870]/50"
        >
          <span>{active.symbol} {active.code}</span>
          <svg
            className={`h-3 w-3 text-white/80 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {open && (
          <ul
            role="listbox"
            className="absolute right-0 top-[calc(100%+8px)] w-48 origin-top-right animate-[dropdownIn_0.15s_ease-out] overflow-hidden rounded-xl border border-[#b1632f]/30 bg-gradient-to-b from-[#242220]/95 to-[#1c1a18]/95 p-1.5 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.6)] backdrop-blur-2xl ring-1 ring-inset ring-white/10"
          >
            {Object.values(CURRENCIES).map((c) => {
              const selected = c.code === currency;
              return (
                <li key={c.code} role="option" aria-selected={selected}>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrency(c.code);
                      setOpen(false);
                    }}
                    className={`group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      selected ? "bg-gradient-to-r from-[#b1632f]/30 to-transparent text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                        selected ? "bg-gradient-to-br from-[#e0a870] to-[#b1632f] text-white shadow-sm" : "bg-white/10 text-white/60 group-hover:bg-white/15"
                      }`}
                    >
                      {c.symbol}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-medium">{c.code}</span>
                      <span className="block truncate text-[11px] text-white/50">{c.label}</span>
                    </span>
                    {selected && (
                      <svg className="h-4 w-4 shrink-0 text-[#e0a870]" viewBox="0 0 20 20" fill="currentColor">
                        <path
                          fillRule="evenodd"
                          d="M16.704 5.29a1 1 0 010 1.415l-7.5 7.5a1 1 0 01-1.415 0l-3.5-3.5a1 1 0 111.415-1.415L8.5 12.086l6.79-6.796a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                </li>
              );
            })}

            <li className="mt-1 border-t border-white/10 px-3 pt-2 pb-1.5">
              {editingRate ? (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase tracking-wide text-white/50">EUR &rarr; IDR rate</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      autoFocus
                      type="text"
                      inputMode="numeric"
                      value={rateInput}
                      onChange={(e) => setRateInput(formatAmountInput(sanitizeAmountInput(e.target.value, "IDR"), "IDR"))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveRate();
                        if (e.key === "Escape") setEditingRate(false);
                      }}
                      className="w-full min-w-0 rounded-md border border-white/15 bg-black/30 px-2 py-1 text-xs text-white outline-none focus:border-[#e0a870]/60"
                    />
                    <button
                      type="button"
                      disabled={savingRate}
                      onClick={saveRate}
                      className="shrink-0 rounded-md bg-[#b1632f] px-2 py-1 text-xs font-semibold text-white hover:bg-[#c17038] disabled:opacity-50"
                    >
                      {savingRate ? "..." : "Save"}
                    </button>
                  </div>
                  {rateError && <span className="text-[10px] text-red-400">{rateError}</span>}
                  <p className="text-[10px] leading-snug text-white/40">
                    Shared with the storefront — updates what /id shoppers are charged too.
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setRateInput(String(Math.round(CURRENCIES.IDR.rateFromEUR)));
                    setEditingRate(true);
                  }}
                  className="w-full rounded-md px-1 py-1 text-left text-[11px] text-white/50 hover:text-white/80"
                >
                  Edit EUR&rarr;IDR rate ({Math.round(CURRENCIES.IDR.rateFromEUR).toLocaleString("id-ID")})
                </button>
              )}
            </li>
          </ul>
        )}
      </div>

      <style jsx global>{`
        @keyframes dropdownIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-4px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
