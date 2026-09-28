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

// ---------- Info popover ----------

/**
 * A small "i" button that explains something: opens on hover (mouse) or click (touch, keyboard),
 * closes on click outside or Esc. Portalled to <body> with fixed positioning so a scrolling table or
 * a frosted card can't clip or trap it.
 */
export function InfoPopover({ label, children }: { label: string; children: ReactNode }) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [pinned, setPinned] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const place = useCallback(() => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const width = 320;
    setPos({ top: r.bottom + 8, left: Math.max(12, Math.min(r.left + r.width / 2 - width / 2, window.innerWidth - width - 12)) });
  }, []);
  const show = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    place();
  };
  const hideSoon = () => {
    if (pinned) return;
    closeTimer.current = setTimeout(() => setPos(null), 120);
  };
  const close = useCallback(() => {
    setPinned(false);
    setPos(null);
  }, []);

  useEffect(() => {
    if (!pos) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!btnRef.current?.contains(t) && !popRef.current?.contains(t)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    // Follows the icon when the page or a table scrolls, instead of closing under the pointer.
    const follow = () => place();
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", follow, true);
    window.addEventListener("resize", follow);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", follow, true);
      window.removeEventListener("resize", follow);
    };
  }, [pos, close, place]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label={label}
        aria-expanded={!!pos}
        onMouseEnter={show}
        onMouseLeave={hideSoon}
        onClick={() => (pinned ? close() : (setPinned(true), place()))}
        className={`ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full align-[-3px] text-[10px] font-bold normal-case tracking-normal transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#e0a870]/60 ${
          pos ? "bg-[#b1632f] text-white" : "bg-[#0f3d34]/10 text-[#0f3d34] hover:bg-[#b1632f] hover:text-white"
        }`}
      >
        i
      </button>
      {pos &&
        createPortal(
          <div
            ref={popRef}
            role="tooltip"
            onMouseEnter={show}
            onMouseLeave={hideSoon}
            style={{ top: pos.top, left: pos.left, width: 320 }}
            className="fixed z-[65] animate-[czPop_0.15s_ease-out] overflow-hidden rounded-xl bg-[#faf8f3] text-left text-xs normal-case leading-relaxed tracking-normal text-[#3d3c37] shadow-[0_20px_50px_-15px_rgba(10,43,37,0.55)] ring-1 ring-black/5"
          >
            <div className="bg-gradient-to-br from-[#154a3f] via-[#0f3d34] to-[#0a2b25] px-4 py-2.5 font-serif text-sm text-[#f2ece1]">{label}</div>
            <div className="px-4 py-3">{children}</div>
            <style>{`@keyframes czPop { from { opacity: 0; transform: translateY(4px) scale(0.98); } to { opacity: 1; transform: none; } }`}</style>
          </div>,
          document.body
        )}
    </>
  );
}

function HelpRow({ tag, tone, children }: { tag: string; tone: string; children: ReactNode }) {
  return (
    <div className="flex gap-2.5 py-1.5">
      <span className={`mt-px h-fit shrink-0 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[10.5px] font-medium ${tone}`}>{tag}</span>
      <p className="min-w-0 [&_strong]:font-semibold [&_strong]:text-[#1c1c1a]">{children}</p>
    </div>
  );
}

const TAG = {
  qty: "border border-[#d9d2c1] bg-white text-[#6b6a63]",
  add: "bg-[#2f7a63]/12 text-[#22604d]",
  remove: "bg-[#b1632f]/12 text-[#8a4a22]",
  set: "bg-[#0f3d34] text-[#f2ece1]",
};

/** What the Change stock controls do: asset tables (our own count) or the two Shopify products. */
export function ChangeStockHelp({ kind }: { kind: "asset" | "product" }) {
  return (
    <InfoPopover label="How to change stock">
      <div className="divide-y divide-[#e6e0d2]">
        <HelpRow tag="Qty" tone={TAG.qty}>
          The number the buttons use. <strong>Whole numbers only</strong>; type it first, then pick an action.
        </HelpRow>
        {kind === "asset" ? (
          <>
            <HelpRow tag="+ Add" tone={TAG.add}>
              Adds Qty to <strong>what&apos;s left now</strong>, e.g. a new delivery. Needs a count first.
            </HelpRow>
            <HelpRow tag="− Remove" tone={TAG.remove}>
              Takes Qty off what&apos;s left, e.g. damaged or lost. Can&apos;t go below 0.
            </HelpRow>
            <HelpRow tag="Set count" tone={TAG.set}>
              <strong>Replaces</strong>{" "}the count with Qty. Use it after counting what&apos;s physically on hand; orders
              placed after that are subtracted automatically.
            </HelpRow>
          </>
        ) : (
          <>
            <HelpRow tag="+ Add" tone={TAG.add}>
              Adds Qty to the <strong>Shopify inventory</strong>. Only once the variant is tracked.
            </HelpRow>
            <HelpRow tag="− Remove" tone={TAG.remove}>
              Takes Qty off the Shopify inventory. Can&apos;t go below 0.
            </HelpRow>
            <HelpRow tag="Set" tone={TAG.set}>
              <strong>Replaces</strong>{" "}the Shopify inventory with Qty. &ldquo;Track &amp; set&rdquo; also turns on tracking the
              first time, so it shows as sold out at 0.
            </HelpRow>
          </>
        )}
      </div>
      <p className="mt-2 rounded-lg bg-[#b5342c]/[0.06] px-3 py-2 text-[#8f2a23]">
        {kind === "asset" ? (
          <>
            <strong className="text-[#8f2a23]">0 = sold out.</strong>{" "}A cover, string, charm or patch at 0 can&apos;t be picked
            in the customizer (after the page reloads). Notebooks, corners and pen holders stay on offer.
          </>
        ) : (
          <>
            <strong className="text-[#8f2a23]">0 = sold out</strong>{" "}on the storefront once the variant is tracked.
          </>
        )}
      </p>
    </InfoPopover>
  );
}
