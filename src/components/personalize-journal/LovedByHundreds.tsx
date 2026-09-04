"use client";

import { useEffect, useState } from "react";

export interface LovedItem {
  src: string;
  alt: string;
}

export function LovedByHundreds({ items }: { items: LovedItem[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const open = activeIndex !== null;

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setActiveIndex(null);
      if (e.key === "ArrowUp") setActiveIndex((i) => (i === null ? i : (i - 1 + items.length) % items.length));
      if (e.key === "ArrowDown") setActiveIndex((i) => (i === null ? i : (i + 1) % items.length));
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, items.length]);

  return (
    <>
      <div className="mt-3 grid grid-cols-5 gap-2">
        {items.map((item, i) => (
          <button
            key={item.src}
            type="button"
            onClick={() => setActiveIndex(i)}
            className="aspect-[3/4] overflow-hidden rounded-md bg-[#f2efe6]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.src} alt={item.alt} className="h-full w-full object-cover" />
          </button>
        ))}
      </div>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4" onClick={() => setActiveIndex(null)}>
          <button
            type="button"
            onClick={() => setActiveIndex(null)}
            aria-label="Close"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#171717]"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>

          <div className="relative max-h-[90vh] w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={items[activeIndex!].src}
              alt={items[activeIndex!].alt}
              className="max-h-[90vh] w-full rounded-md object-contain"
            />

            <button
              type="button"
              onClick={() => setActiveIndex((i) => (i === null ? i : (i - 1 + items.length) % items.length))}
              aria-label="Previous"
              className="absolute -right-14 top-1/2 hidden h-10 w-10 -translate-y-[calc(50%+28px)] items-center justify-center rounded-full bg-white text-[#171717] sm:flex"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                <path d="M18 15l-6-6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setActiveIndex((i) => (i === null ? i : (i + 1) % items.length))}
              aria-label="Next"
              className="absolute -right-14 top-1/2 hidden h-10 w-10 -translate-y-[calc(50%-28px)] items-center justify-center rounded-full bg-white text-[#171717] sm:flex"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {/* Mobile: stacked up/down controls below the image instead of off to the side. */}
            <div className="mt-3 flex justify-center gap-3 sm:hidden">
              <button
                type="button"
                onClick={() => setActiveIndex((i) => (i === null ? i : (i - 1 + items.length) % items.length))}
                aria-label="Previous"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#171717]"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                  <path d="M18 15l-6-6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setActiveIndex((i) => (i === null ? i : (i + 1) % items.length))}
                aria-label="Next"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#171717]"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
