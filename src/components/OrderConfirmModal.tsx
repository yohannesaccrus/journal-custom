"use client";

import { PATCH_POSITION, type CharmEntry } from "@/lib/catalog";
import { PatchIcon } from "@/components/PatchIcon";
import type { JournalSelection, PlacedCharm } from "@/lib/types";

interface SummaryRow {
  label: string;
  value: string;
}

interface OrderConfirmModalProps {
  imageSrc: string;
  patch: JournalSelection["patch"];
  frontCharms: PlacedCharm[];
  charmEntries: CharmEntry[];
  rows: SummaryRow[];
  formattedTotal: string;
  designUrl: string;
  copied: boolean;
  onCopyLink: () => void;
  onEdit: () => void;
  onConfirm: () => void;
  confirming?: boolean;
}

export function OrderConfirmModal({
  imageSrc,
  patch,
  frontCharms,
  charmEntries,
  rows,
  formattedTotal,
  designUrl,
  copied,
  onCopyLink,
  onEdit,
  onConfirm,
  confirming,
}: OrderConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onEdit} />

      <div className="step-fade-in relative flex w-full max-w-lg flex-col overflow-hidden rounded-[var(--radius-panel)] bg-[var(--card-bg)] shadow-2xl max-h-[90vh]">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-6 py-5">
          <div>
            <h2 className="text-xl font-heading text-[var(--ink)]">Your journal is one step away</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">Take a last look before we send you to payment.</p>
          </div>
          <button
            type="button"
            onClick={onEdit}
            aria-label="Close"
            className="shrink-0 rounded-full p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--surface-soft)] hover:text-[var(--ink)]"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5">
          <div className="relative mx-auto aspect-square w-full max-w-[260px] overflow-hidden rounded-[var(--radius-panel)] bg-[var(--surface-soft)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageSrc} alt="Your custom journal" className="h-full w-full object-cover" />
            {patch !== "none" && (
              <div
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `${PATCH_POSITION.x}%`,
                  top: `${PATCH_POSITION.y}%`,
                  width: `${PATCH_POSITION.sizePercent}%`,
                  aspectRatio: "1",
                }}
              >
                <PatchIcon shape={patch} className="h-full w-full drop-shadow-md" />
              </div>
            )}
            {frontCharms.map((c) => (
              <div
                key={c.instanceId}
                className="pointer-events-none absolute h-7 w-7 -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${c.x}%`, top: `${c.y}%` }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={charmEntries.find((e) => e.variantId === c.variantId)?.imageUrl}
                  alt={c.design}
                  className="h-full w-full object-contain drop-shadow-md"
                />
              </div>
            ))}
          </div>

          <dl className="mt-5 divide-y divide-[var(--border)] rounded-[var(--radius-panel)] bg-[var(--surface-soft)] px-4">
            {rows.map((r) => (
              <div key={r.label} className="flex items-center justify-between py-2.5">
                <dt className="text-xs text-[var(--muted)]">{r.label}</dt>
                <dd className="text-xs font-medium text-[var(--ink)]">{r.value}</dd>
              </div>
            ))}
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-sm text-[var(--muted)]">Total</dt>
              <dd className="text-base font-semibold text-[var(--ink)]">{formattedTotal}</dd>
            </div>
          </dl>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <a
              href={designUrl}
              target="_blank"
              rel="noreferrer"
              className="flex flex-1 items-center justify-center gap-2 rounded-[var(--radius-button)] border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--ink)] transition-colors hover:bg-[var(--surface-soft)]"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                <path
                  d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
              </svg>
              View full design
            </a>
            <button
              type="button"
              onClick={onCopyLink}
              className="flex flex-1 items-center justify-center gap-2 rounded-[var(--radius-button)] border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--ink)] transition-colors hover:bg-[var(--surface-soft)]"
            >
              {copied ? (
                <>
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                    <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Link copied
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                    <rect x="8" y="8" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" />
                    <path d="M4 16V6a2 2 0 0 1 2-2h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                  Copy Design Link
                </>
              )}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-[var(--border)] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onEdit}
            className="text-sm font-medium text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
          >
            ← Keep editing
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirming}
            className="btn-continue rounded-[var(--radius-button)] bg-[var(--accent)] px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {confirming ? "Adding to cart…" : "Continue to payment →"}
          </button>
        </div>
      </div>
    </div>
  );
}
