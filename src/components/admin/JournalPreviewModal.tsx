"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { DesignSlider } from "@/components/DesignSlider";
import { PriceDisplay } from "@/app/admin/(dashboard)/PriceDisplay";
import type { OrderJournalPreview } from "@/lib/admin/order-preview";

/**
 * The Journal-column thumbnail — clickable (and shows a hover affordance)
 * whenever a decoded design spec is available to preview; otherwise it's
 * just the static image, same as before this feature existed.
 */
export function JournalThumbnail({
  imageUrl,
  title,
  preview,
  note,
}: {
  imageUrl: string | null;
  title: string;
  preview: OrderJournalPreview | null;
  note?: string | null;
}) {
  const [open, setOpen] = useState(false);

  const thumb = (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#eae7de] bg-[#f7f5f0]">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="text-[10px] text-[#c8c2b3]">—</span>
      )}
    </span>
  );

  if (!preview) {
    return (
      <div className="flex items-center gap-2 whitespace-nowrap">
        {thumb}
        <span className="text-xs text-[#1c1c1a]">{title}</span>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Click to view the finished design"
        className="group flex items-center gap-2 whitespace-nowrap rounded-lg transition-colors hover:bg-white/60 -mx-1 px-1 py-0.5"
      >
        <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#eae7de] bg-[#f7f5f0] ring-0 ring-[#0f3d34]/0 transition-all group-hover:ring-2 group-hover:ring-[#0f3d34]/25">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-[10px] text-[#c8c2b3]">—</span>
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-[#0f3d34]/0 opacity-0 transition-all group-hover:bg-[#0f3d34]/40 group-hover:opacity-100">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-white">
              <path
                d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          {/* Always-visible clue (not just on hover) that this thumbnail opens a design preview. */}
          <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border border-white bg-[#0f3d34] text-white shadow-sm">
            <svg viewBox="0 0 24 24" fill="none" className="h-2.5 w-2.5">
              <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="2" />
              <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
        </span>
        <span className="flex flex-col items-start">
          <span className="text-xs text-[#1c1c1a] underline decoration-[#d8d5cb] decoration-dotted underline-offset-4 group-hover:decoration-[#0f3d34]">
            {title}
          </span>
          <span className="text-[10px] text-[#a89a80] group-hover:text-[#0f3d34]">Click to view design</span>
        </span>
      </button>

      {open && <JournalPreviewModal title={title} preview={preview} note={note} onClose={() => setOpen(false)} />}
    </>
  );
}

function JournalPreviewModal({
  title,
  preview,
  note,
  onClose,
}: {
  title: string;
  preview: OrderJournalPreview;
  note?: string | null;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#0a2b25]/60 backdrop-blur-sm" onClick={onClose} />

      <div className="animate-[popIn_0.15s_ease-out] relative flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/70 bg-[#faf8f3] shadow-2xl max-h-[90vh]">
        <div className="flex items-start justify-between gap-4 border-b border-[#eae7de] bg-gradient-to-r from-white to-[#f7f5f0] px-6 py-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-[#a89a80]">Design preview</p>
            <h2 className="mt-0.5 text-lg font-serif text-[#1c1c1a]">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-full p-1.5 text-[#a89a80] transition-colors hover:bg-[#f0ece0] hover:text-[#1c1c1a]"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 overflow-y-auto px-6 py-6 md:grid-cols-2">
          <div className="flex justify-center">
            <DesignSlider views={preview.views} charmEntries={preview.charmEntries} patch={preview.patch} />
          </div>

          <div className="flex flex-col gap-4">
            <dl className="divide-y divide-[#eae7de] rounded-xl bg-white/70 px-4 ring-1 ring-inset ring-white/70">
              {preview.specRows.map((r) => (
                <div key={r.label} className="flex items-center justify-between gap-4 py-2.5">
                  <dt className="text-xs text-[#6b6a63]">{r.label}</dt>
                  <dd className="text-xs font-medium text-[#1c1c1a] text-right">{r.value}</dd>
                </div>
              ))}
            </dl>

            {note && (
              <div className="rounded-xl bg-white/70 px-4 py-3 ring-1 ring-inset ring-white/70">
                <h3 className="text-xs font-medium uppercase tracking-wide text-[#6b6a63]">Note from customer</h3>
                <p className="mt-1.5 whitespace-pre-wrap text-xs text-[#4a4944]">{note}</p>
              </div>
            )}

            {preview.charms.length > 0 && (
              <div className="flex flex-col min-h-0">
                <h3 className="text-xs font-medium uppercase tracking-wide text-[#6b6a63]">
                  Charms ({preview.charms.length})
                </h3>
                <ul className="mt-2 max-h-48 space-y-1.5 overflow-y-auto pr-1">
                  {preview.charms.map((c) => (
                    <li
                      key={c.instanceId}
                      className="flex items-center gap-2.5 rounded-lg bg-white/70 px-3 py-2 text-xs text-[#4a4944] ring-1 ring-inset ring-white/70"
                    >
                      {c.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.imageUrl} alt="" className="h-5 w-5 shrink-0 object-contain" />
                      )}
                      <span className="min-w-0 flex-1 truncate">
                        {c.design} — {c.side.charAt(0).toUpperCase() + c.side.slice(1)}
                      </span>
                      {c.priceEUR !== undefined && (
                        <PriceDisplay amountEUR={c.priceEUR} className="shrink-0 font-medium text-[#1c1c1a]" />
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes popIn {
          0% {
            opacity: 0;
            transform: scale(0.96);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>,
    document.body
  );
}
