"use client";

import { useEffect, useRef, useState } from "react";
import { CZ_MARKETS, type CzMarket } from "@/lib/markets";
import { useMarket } from "./MarketContext";

const OPTIONS: { value: CzMarket; code: string; label: string }[] = [
  ...CZ_MARKETS.map((m) => ({ value: m.country, code: m.country, label: m.label })),
  { value: "BASE", code: "Base", label: "Product price (store currency)" },
];

/**
 * Same floating pill as the currency switcher, but picks a Shopify market: prices are then what
 * a shopper in that country is charged, read from Shopify, not converted here.
 */
export function MarketSwitcher() {
  const { market, setMarket } = useMarket();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const active = OPTIONS.find((o) => o.value === market) ?? OPTIONS[0];

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
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#e0a870]">Market</span>

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="flex items-center gap-1.5 rounded-full border border-white/10 bg-gradient-to-r from-[#b1632f] to-[#9c5426] py-1 pl-3 pr-2.5 text-xs font-semibold text-white shadow-inner transition-colors hover:from-[#c17038] hover:to-[#b1632f] focus:outline-none focus:ring-2 focus:ring-[#e0a870]/50"
        >
          <span>{active.value === "BASE" ? "Base price" : `${active.code} · ${active.label}`}</span>
          <svg className={`h-3 w-3 text-white/80 transition-transform duration-150 ${open ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor">
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
            className="absolute right-0 top-[calc(100%+8px)] max-h-[70vh] w-60 origin-top-right animate-[dropdownIn_0.15s_ease-out] overflow-y-auto rounded-xl border border-[#b1632f]/30 bg-gradient-to-b from-[#242220]/95 to-[#1c1a18]/95 p-1.5 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.6)] backdrop-blur-2xl ring-1 ring-inset ring-white/10"
          >
            {OPTIONS.map((o) => {
              const selected = o.value === market;
              return (
                <li key={o.value} role="option" aria-selected={selected} className={o.value === "BASE" ? "mt-1 border-t border-white/10 pt-1" : ""}>
                  <button
                    type="button"
                    onClick={() => {
                      setMarket(o.value);
                      setOpen(false);
                    }}
                    className={`group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      selected ? "bg-gradient-to-r from-[#b1632f]/30 to-transparent text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <span
                      className={`flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-semibold transition-colors ${
                        selected ? "bg-gradient-to-br from-[#e0a870] to-[#b1632f] text-white shadow-sm" : "bg-white/10 text-white/60 group-hover:bg-white/15"
                      }`}
                    >
                      {o.code}
                    </span>
                    <span className="block min-w-0 flex-1 truncate font-medium">{o.label}</span>
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
            <li className="mt-1 border-t border-white/10 px-3 pt-2 pb-1.5 text-[10px] leading-snug text-white/40">
              Prices are what Shopify charges a shopper in that country. Prices are edited in IDR.
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
