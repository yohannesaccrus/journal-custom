"use client";

import { useEffect, useState } from "react";
import { AdminNav } from "./AdminNav";

/** Mobile-only hamburger + slide-in drawer duplicating the desktop `<aside>` sidebar (hidden below `md:`) — the fixed-width sidebar in layout.tsx has no mobile equivalent otherwise. */
export function AdminMobileNav({ orderCount }: { orderCount: number }) {
  const [open, setOpen] = useState(false);

  // Lock page scroll while the drawer is open, same as the other admin modals.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="fixed top-4 left-4 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[#0f3d34] text-white shadow-lg md:hidden"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
          <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative flex h-full w-72 max-w-[80vw] flex-col bg-gradient-to-b from-[#154a3f] via-[#0f3d34] to-[#0a2b25] text-white shadow-2xl">
            <div className="flex items-center justify-between px-6 py-6">
              <div>
                <span className="text-lg tracking-[0.2em] font-serif text-[#f2ece1]">SANAYA</span>
                <p className="mt-0.5 text-xs text-[#a89a80]">Admin panel</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="rounded-full p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col" onClick={() => setOpen(false)}>
              <AdminNav orderCount={orderCount} />
            </div>
            <form action="/api/admin/logout" method="POST" className="shrink-0 px-3 pb-6">
              <button
                type="submit"
                className="w-full rounded-lg px-3 py-2 text-left text-sm text-[#f2ece1]/70 transition-colors hover:bg-white/10 hover:text-white"
              >
                Log out
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
