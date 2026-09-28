"use client";

import { useCallback, useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode, type Ref } from "react";
import { createPortal } from "react-dom";

/**
 * Small UI kit for the Customizer Stock page, in the sidebar's language: deep green gradient,
 * cream text, burnt-orange accents, frosted glass cards.
 */

export function Spinner({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

type Variant = "primary" | "secondary" | "ghost" | "success" | "danger";
const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-gradient-to-b from-[#154a3f] to-[#0f3d34] text-[#f2ece1] shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_1px_2px_rgba(10,43,37,0.3)] hover:from-[#1a5a4d] hover:to-[#124a3f]",
  secondary: "border border-[#d9d2c1] bg-white/70 text-[#1c1c1a] hover:border-[#0f3d34]/40 hover:bg-white",
  ghost: "text-[#0f3d34] hover:bg-[#0f3d34]/[0.07]",
  success: "border border-[#2f7a63]/25 bg-[#2f7a63]/10 text-[#22604d] hover:bg-[#2f7a63]/[0.18]",
  danger: "border border-[#b1632f]/25 bg-[#b1632f]/10 text-[#8a4a22] hover:bg-[#b1632f]/[0.18]",
};

export function Button({
  variant = "primary",
  loading = false,
  className = "",
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean; ref?: Ref<HTMLButtonElement> }) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#e0a870]/60 disabled:cursor-not-allowed disabled:opacity-45 ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export type Tone = "ok" | "low" | "out" | "muted";
const PILL: Record<Tone, string> = {
  ok: "bg-[#2f7a63]/12 text-[#22604d] ring-[#2f7a63]/20",
  low: "bg-[#b1632f]/12 text-[#8a4a22] ring-[#b1632f]/25",
  out: "bg-[#b5342c]/10 text-[#9a2a23] ring-[#b5342c]/25",
  muted: "bg-[#1c1c1a]/[0.05] text-[#6b6a63] ring-[#1c1c1a]/10",
};
const DOT: Record<Tone, string> = { ok: "bg-[#2f7a63]", low: "bg-[#b1632f]", out: "bg-[#b5342c]", muted: "bg-[#a8a498]" };

export function Pill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${PILL[tone]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${DOT[tone]}`} />
      {children}
    </span>
  );
}

export function Notice({ tone, children, action }: { tone: "warning" | "error"; children: ReactNode; action?: ReactNode }) {
  const cls =
    tone === "error"
      ? "border-[#b5342c]/25 bg-[#b5342c]/[0.06] text-[#8f2a23]"
      : "border-[#b1632f]/25 bg-gradient-to-r from-[#b1632f]/[0.09] to-[#e0a870]/[0.05] text-[#7a4520]";
  return (
    <div className={`flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 text-sm backdrop-blur-xl ${cls}`}>
      <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
        <path
          fillRule="evenodd"
          d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z"
          clipRule="evenodd"
        />
      </svg>
      <div className="min-w-0 flex-1">{children}</div>
      {action}
    </div>
  );
}

// ---------- Confirm dialog (replaces the browser's window.confirm) ----------

export interface ConfirmOptions {
  title: string;
  body: ReactNode;
  confirmLabel?: string;
}

/** `const { confirm, dialog } = useConfirm()`; render `dialog`, then `if (!(await confirm({...}))) return;`. */
export function useConfirm() {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<(ok: boolean) => void>(() => {});

  const confirm = useCallback(
    (o: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        resolver.current = resolve;
        setOpts(o);
      }),
    []
  );
  const close = (ok: boolean) => {
    setOpts(null);
    resolver.current(ok);
  };

  // Portalled to <body>: the frosted cards' backdrop-filter would otherwise trap a fixed overlay inside them.
  return { confirm, dialog: opts ? createPortal(<ConfirmDialog {...opts} onClose={close} />, document.body) : null };
}

function ConfirmDialog({ title, body, confirmLabel = "Confirm", onClose }: ConfirmOptions & { onClose: (ok: boolean) => void }) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  // Cancel gets focus and Confirm ignores clicks for a moment: the Enter that opened the dialog
  // (e.g. from a price input) must never land on Confirm and save without a real click.
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    cancelRef.current?.focus();
    const t = setTimeout(() => setArmed(true), 400);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close" onClick={() => onClose(false)} className="absolute inset-0 animate-[czFade_0.15s_ease-out] bg-[#0a2b25]/45 backdrop-blur-sm" />
      <div className="relative w-full max-w-md animate-[czPop_0.18s_ease-out] overflow-hidden rounded-2xl bg-[#faf8f3] shadow-[0_30px_80px_-20px_rgba(10,43,37,0.6)] ring-1 ring-black/5">
        <div className="relative overflow-hidden bg-gradient-to-br from-[#154a3f] via-[#0f3d34] to-[#0a2b25] px-5 py-4">
          <div className="pointer-events-none absolute -top-10 -right-6 h-28 w-28 rounded-full bg-[#b1632f]/35 blur-[40px]" />
          <h3 className="relative font-serif text-lg text-[#f2ece1]">{title}</h3>
        </div>
        <div className="px-5 py-4 text-sm leading-relaxed text-[#3d3c37]">{body}</div>
        <div className="flex justify-end gap-2 border-t border-[#e6e0d2] bg-white/50 px-5 py-3">
          <Button ref={cancelRef} variant="secondary" onClick={() => onClose(false)}>
            Cancel
          </Button>
          <Button onClick={() => armed && onClose(true)}>
            {confirmLabel}
          </Button>
        </div>
      </div>
      <style jsx global>{`
        @keyframes czFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes czPop {
          from { opacity: 0; transform: translateY(6px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

// ---------- Toast ----------

const TOAST_EVENT = "cz-toast";

/** Shows a short confirmation at the bottom right (rendered by <Toaster />). */
export function toast(message: string, tone: "ok" | "error" = "ok") {
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: { message, tone } }));
}

export function Toaster() {
  const [items, setItems] = useState<{ id: number; message: string; tone: "ok" | "error" }[]>([]);
  useEffect(() => {
    let next = 0;
    const onToast = (e: Event) => {
      const { message, tone } = (e as CustomEvent<{ message: string; tone: "ok" | "error" }>).detail;
      const id = next++;
      setItems((xs) => [...xs, { id, message, tone }]);
      setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 3200);
    };
    window.addEventListener(TOAST_EVENT, onToast);
    return () => window.removeEventListener(TOAST_EVENT, onToast);
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[70] flex flex-col items-end gap-2" aria-live="polite">
      {items.map((t) => (
        <div
          key={t.id}
          className={`flex animate-[czPop_0.18s_ease-out] items-center gap-2 rounded-full px-4 py-2 text-sm shadow-[0_12px_30px_-10px_rgba(10,43,37,0.6)] ring-1 ring-white/10 ${
            t.tone === "ok" ? "bg-gradient-to-r from-[#154a3f] to-[#0f3d34] text-[#f2ece1]" : "bg-[#9a2a23] text-white"
          }`}
        >
          <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${t.tone === "ok" ? "bg-[#e0a870] text-[#0a2b25]" : "bg-white/20"}`}>
            {t.tone === "ok" ? "✓" : "!"}
          </span>
          {t.message}
        </div>
      ))}
    </div>
  );
}
