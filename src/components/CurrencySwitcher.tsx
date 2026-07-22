"use client";

import { useEffect, useRef, useState } from "react";
import { CURRENCIES } from "@/lib/currency";
import { useCurrency } from "@/components/CurrencyContext";

/**
 * Themed entirely off the active style's CSS variables (--accent,
 * --card-bg, --border, --radius-*, font-heading) so it automatically
 * matches whichever of the three styles is active with no extra styling
 * per-theme. Opens upward since it always sits at the bottom of the card.
 */
export function CurrencySwitcher({ className }: { className?: string }) {
  const { currency, setCurrency } = useCurrency();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const active = CURRENCIES[currency];

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
    <div ref={rootRef} className={`relative ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`currency-trigger flex items-center gap-2 rounded-[var(--radius-button)] py-1 pl-1 pr-3 ${open ? "is-open" : ""}`}
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] font-heading text-xs text-white shadow-sm">
          {active.symbol}
        </span>
        <span className="text-sm font-semibold text-[var(--ink)]">{active.code}</span>
        <svg
          className={`h-3.5 w-3.5 text-[var(--accent)] transition-transform duration-150 ${open ? "rotate-180" : ""}`}
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
          className="step-fade-in absolute bottom-[calc(100%+8px)] left-0 z-50 w-48 overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border)] bg-[var(--card-bg)] p-1.5 shadow-2xl"
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
                  className={`flex w-full items-center gap-2.5 rounded-[var(--radius-chip)] px-2.5 py-2 text-left text-sm transition-colors ${
                    selected ? "bg-[var(--accent)]/10 text-[var(--accent)]" : "text-[var(--ink)] hover:bg-[var(--surface-soft)]"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-heading text-xs ${
                      selected ? "bg-[var(--accent)] text-white" : "bg-[var(--surface-soft)] text-[var(--muted)]"
                    }`}
                  >
                    {c.symbol}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{c.code}</span>
                    <span className="block truncate text-[10px] text-[var(--faint)]">{c.label}</span>
                  </span>
                  {selected && (
                    <svg className="h-4 w-4 shrink-0 text-[var(--accent)]" viewBox="0 0 20 20" fill="currentColor">
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
        </ul>
      )}
    </div>
  );
}
