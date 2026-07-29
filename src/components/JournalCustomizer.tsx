"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { CoverStep } from "@/components/steps/CoverStep";
import { CordStep } from "@/components/steps/CordStep";
import { PatchStep } from "@/components/steps/PatchStep";
import { PenHolderStep } from "@/components/steps/PenHolderStep";
import { CharmsStep, DRAG_MIME, newPlacement } from "@/components/steps/CharmsStep";
import { NotebooksStep } from "@/components/steps/NotebooksStep";
import { PreviewStep } from "@/components/steps/PreviewStep";
import { OrderConfirmModal } from "@/components/OrderConfirmModal";
import { NotebookIcon } from "@/components/NotebookIcon";
import { PatchIcon } from "@/components/PatchIcon";
import { ThemeSwitcher, THEMES, type Theme } from "@/components/ThemeSwitcher";
import { BackgroundSwitcher, type BackgroundMode } from "@/components/BackgroundSwitcher";
import { MobileViewSwitcher } from "@/components/MobileViewSwitcher";
import { DisabledHint } from "@/components/DisabledHint";
import { CurrencyProvider, useCurrencyFormat } from "@/components/CurrencyContext";
import { CurrencySwitcher } from "@/components/CurrencySwitcher";
import {
  buildCharmEntries,
  buildCordEntries,
  buildCoverEntries,
  charmsTotal,
  NOTEBOOKS_PER_JOURNAL,
  notebookCount,
  patchPrice,
  PATCH_POSITION,
  resolveFrontImage,
  resolveSideImage,
  resolveVariant,
} from "@/lib/catalog";
import { buildCartItems } from "@/lib/cart";
import { buildDesignUrl } from "@/lib/design-link";
import type { ShopifyJournalProduct, SwatchColors } from "@/lib/shopify-admin";
import type { CharmSide, CoverCategory, JournalSelection, PlacedCharm } from "@/lib/types";

const STEPS = ["Journal Covers", "Charms", "Accessories", "Content", "Preview"] as const;
const JOURNAL_COVERS_STEP = 0;
const CHARMS_STEP = 1;
const ACCESSORIES_STEP = 2;
const NOTEBOOKS_STEP = 3;
const PREVIEW_STEP = 4;
const ROMAN_NUMERALS = ["I", "II", "III", "IV", "V"];

// Picsum Photos (picsum.photos) serves free, license-friendly random stock
// photos with no API key. A fixed seed per style keeps the same photo on
// every reload instead of a fresh random one each render.
const WALLPAPER_URL: Record<Theme, string> = {
  heritage: "https://picsum.photos/seed/sanaya-heritage/1600/1000",
  studio: "https://picsum.photos/seed/sanaya-studio-mono/1600/1000?grayscale",
  atelier: "https://picsum.photos/seed/sanaya-atelier/1600/1000",
};

interface JournalCustomizerProps {
  products: ShopifyJournalProduct[];
  charmProduct: ShopifyJournalProduct;
  notebookProduct: ShopifyJournalProduct;
  patchProduct: ShopifyJournalProduct;
  /** Admin-edited swatch colors for String/Pen Holder — see `fetchSwatchColors`. */
  swatchColors: SwatchColors;
  // Set when this render is the phone-sized <iframe> embed the "Mobile View"
  // toggle opens (see page.tsx) — suppresses all the dev-only style controls
  // so the embed just shows the customizer itself, seeded to match whatever
  // the outer page had selected.
  hideDevControls?: boolean;
  initialTheme?: Theme;
  initialBackground?: BackgroundMode;
}

export function JournalCustomizer(props: JournalCustomizerProps) {
  return (
    <CurrencyProvider>
      <JournalCustomizerContent {...props} />
    </CurrencyProvider>
  );
}

function JournalCustomizerContent({
  products,
  charmProduct,
  notebookProduct,
  patchProduct,
  swatchColors,
  hideDevControls,
  initialTheme,
  initialBackground,
}: JournalCustomizerProps) {
  // The style tools (theme/background/mobile-view switchers) are always on
  // in development. In production they're normally hidden from real
  // customers, but a reviewer can unlock them on the live deployment with
  // ?styleTools=1 — that unlock then persists via localStorage so it
  // survives reloads without needing the query param every time.
  //
  // Temporarily disabled: flip this back to true to restore the ?styleTools=1
  // unlock on live deployments. Style 1 is the only shipped look while this
  // is off — Style 2/3 stay fully intact in THEMES, just unreachable.
  const STYLE_TOOLS_UNLOCKABLE = false;
  const [toolsUnlocked, setToolsUnlocked] = useState(false);
  useEffect(() => {
    if (hideDevControls || !STYLE_TOOLS_UNLOCKABLE) return;
    const hasParam = new URLSearchParams(window.location.search).get("styleTools") === "1";
    const stored = window.localStorage.getItem("sanaya-journal-tools-unlocked") === "1";
    if (hasParam) window.localStorage.setItem("sanaya-journal-tools-unlocked", "1");
    if (hasParam || stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time unlock check from the URL/localStorage, not derivable at initial render without a hydration mismatch
      setToolsUnlocked(true);
    }
  }, [hideDevControls]);
  const isDev = (process.env.NODE_ENV !== "production" || toolsUnlocked) && !hideDevControls;

  // Style preview: which of the three customizer looks is active. Persisted
  // to localStorage purely so it survives a page reload while a client is
  // clicking through options during a review call.
  const [theme, setTheme] = useState<Theme>(initialTheme ?? THEMES[0].id);
  useEffect(() => {
    // Restore-after-mount (and again if `isDev` flips on via the
    // styleTools unlock above) so server and client render the same
    // default on first paint — no hydration mismatch.
    if (!isDev) return;
    const stored = window.localStorage.getItem("sanaya-journal-theme");
    if (stored && THEMES.some((t) => t.id === stored) && stored !== theme) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore of a persisted preference, not derivable at initial render without a hydration mismatch
      setTheme(stored as Theme);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-check when isDev turns on
  }, [isDev]);
  useEffect(() => {
    if (isDev) window.localStorage.setItem("sanaya-journal-theme", theme);
  }, [theme, isDev]);

  // Plain theme-color background vs. a blurred wallpaper wash built from
  // that theme's own palette. Same restore-after-mount pattern as the theme
  // picker above, for the same hydration-safety reason.
  const [background, setBackground] = useState<BackgroundMode>(initialBackground ?? "plain");
  useEffect(() => {
    if (!isDev) return;
    const stored = window.localStorage.getItem("sanaya-journal-background");
    if ((stored === "plain" || stored === "wallpaper") && stored !== background) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore of a persisted preference, not derivable at initial render without a hydration mismatch
      setBackground(stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-check when isDev turns on
  }, [isDev]);
  useEffect(() => {
    if (isDev) window.localStorage.setItem("sanaya-journal-background", background);
  }, [background, isDev]);

  // Dev-only: preview the customizer inside a phone-sized <iframe> pointing
  // at the dedicated /mobile-preview route (see app/mobile-preview/page.tsx)
  // so a real `md:` breakpoint switch happens inside the iframe's own narrow
  // viewport, instead of trying to fake it by just shrinking a div.
  const [mobilePreview, setMobilePreview] = useState(false);

  const { format } = useCurrencyFormat();

  const [step, setStep] = useState(0);
  const [category, setCategory] = useState<CoverCategory>("classic");
  const [selection, setSelection] = useState<JournalSelection>({
    cover: buildCoverEntries(products).find((c) => c.category === "classic")?.handle ?? products[0]?.handle ?? "",
    cord: "none",
    penHolder: "none",
    edge: false,
    patch: "none",
    charms: [],
    notebooks: {},
  });
  const [addingToCart, setAddingToCart] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);
  const [orderConfirm, setOrderConfirm] = useState<{ invoiceUrl: string; designUrl: string } | null>(null);
  const [designLinkCopied, setDesignLinkCopied] = useState(false);
  // True when `selection.cord` was auto-picked by handlePenHolderChange
  // (only so a real Shopify variant resolves) rather than chosen by the
  // user — Patch should still read as locked in that case, since the user
  // never actually decided on a cord.
  const [cordAutoSelected, setCordAutoSelected] = useState(false);
  // Which side the left preview shows while on the Charms step — clicking
  // the Front/Back/Side canvas over there switches this.
  const [charmView, setCharmView] = useState<CharmSide>("front");

  // Smoothly animates the card body height when switching steps (each step's
  // content has a different natural height) instead of snapping instantly.
  // A state-backed callback ref (rather than useRef + an empty-deps effect)
  // so the observer re-attaches whenever the underlying DOM node changes —
  // e.g. when the "Mobile View" toggle swaps this whole tree out and back
  // in, the old node would otherwise be watched forever, leaving bodyHeight
  // stuck at a stale value and clipping the content to near-zero height.
  const [bodyEl, setBodyEl] = useState<HTMLDivElement | null>(null);
  const [bodyHeight, setBodyHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!bodyEl) return;

    const observer = new ResizeObserver(([entry]) => {
      setBodyHeight(entry.contentRect.height);
    });
    observer.observe(bodyEl);
    return () => observer.disconnect();
  }, [bodyEl]);

  // When embedded in an iframe (e.g. the Shopify storefront), tell the parent
  // page our actual content height so it can resize the iframe instead of
  // showing a fixed-height scrollbar. No-op when viewed standalone.
  useEffect(() => {
    if (window.parent === window) return;

    function postHeight() {
      const height = document.documentElement.scrollHeight;
      window.parent.postMessage({ type: "sanaya-journal-resize", height }, "*");
    }

    postHeight();
    const observer = new ResizeObserver(postHeight);
    observer.observe(document.documentElement);
    window.addEventListener("resize", postHeight);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", postHeight);
    };
  }, [step]);

  const product = useMemo(
    () => products.find((p) => p.handle === selection.cover) ?? products[0],
    [products, selection.cover]
  );
  const variant = useMemo(() => resolveVariant(product, selection), [product, selection]);
  const imageSrc = resolveFrontImage(variant);
  const charmEntries = useMemo(() => buildCharmEntries(charmProduct), [charmProduct]);
  const total =
    Number(variant.price) + charmsTotal(charmProduct, selection.charms) + patchPrice(patchProduct, selection.patch);
  const frontCharms = selection.charms.filter((c) => c.side === "front");
  const backCharms = selection.charms.filter((c) => c.side === "back");
  const sideCharms = selection.charms.filter((c) => c.side === "side");
  const orderConfirmRows = [
    { label: "Cover", value: buildCoverEntries(products).find((c) => c.handle === product.handle)?.label ?? product.title },
    { label: "String", value: selection.cord !== "none" ? selection.cord : "None" },
    { label: "Pen holder", value: selection.penHolder === "none" ? "None" : selection.penHolder === "black" ? "Black" : "Brown" },
    {
      label: "Charms",
      value:
        selection.charms.length === 0
          ? "None"
          : [
              frontCharms.length > 0 ? `${frontCharms.length} front` : null,
              backCharms.length > 0 ? `${backCharms.length} back` : null,
              sideCharms.length > 0 ? `${sideCharms.length} side` : null,
            ]
              .filter(Boolean)
              .join(", "),
    },
    {
      label: "Notebooks",
      value:
        Object.keys(selection.notebooks).length === 0
          ? "None"
          : Object.entries(selection.notebooks).map(([design, count]) => `${count}× ${design}`).join(", "),
    },
  ];
  const backImageSrc = resolveSideImage(product, "back", selection);
  const sideImageSrc = resolveSideImage(product, "side", selection);
  const isCharmsStep = step === CHARMS_STEP;
  const mainView: CharmSide = isCharmsStep ? charmView : "front";
  const mainImageSrc = mainView === "front" ? imageSrc : mainView === "back" ? backImageSrc : sideImageSrc;
  const mainCharms = mainView === "front" ? frontCharms : mainView === "back" ? backCharms : sideCharms;

  // Lets the large preview on the left act as a second drop target for
  // charms, mirroring the small canvases in CharmsStep — both read/write
  // the same `selection.charms`, so a charm dropped on either side shows up
  // reflected on the other immediately. Two refs (not one) because the
  // "side" view's actual image lives inside a narrower inner strip, offset
  // within the outer aspect box — using the outer box's bounds there would
  // misalign drop/drag coordinates against the visible artwork.
  const previewFrontBackRef = useRef<HTMLDivElement>(null);
  const previewSideRef = useRef<HTMLDivElement>(null);
  const mainDragId = useRef<string | null>(null);

  function mainPosFromEvent(clientX: number, clientY: number) {
    const el = mainView === "side" ? previewSideRef.current : previewFrontBackRef.current;
    if (!el) return { x: 50, y: 50 };
    const rect = el.getBoundingClientRect();
    const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
    return {
      x: clamp(((clientX - rect.left) / rect.width) * 100, 4, 96),
      y: clamp(((clientY - rect.top) / rect.height) * 100, 4, 96),
    };
  }

  function handleMainDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function handleMainDrop(e: React.DragEvent) {
    e.preventDefault();
    const raw = e.dataTransfer.getData(DRAG_MIME);
    if (!raw) return;
    const { variantId, design } = JSON.parse(raw);
    const { x, y } = mainPosFromEvent(e.clientX, e.clientY);
    updateSelection({ charms: [...selection.charms, newPlacement(variantId, design, mainView, x, y)] });
  }

  function handleMainCharmPointerMove(e: React.PointerEvent) {
    if (!mainDragId.current) return;
    const { x, y } = mainPosFromEvent(e.clientX, e.clientY);
    const id = mainDragId.current;
    updateSelection({ charms: selection.charms.map((c) => (c.instanceId === id ? { ...c, x, y } : c)) });
  }

  function handleMainCharmPointerUp(e: React.PointerEvent) {
    mainDragId.current = null;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
  }

  function removeMainCharm(instanceId: string) {
    updateSelection({ charms: selection.charms.filter((c) => c.instanceId !== instanceId) });
  }

  function renderMainCharmMarker(c: PlacedCharm) {
    return (
      <div
        key={c.instanceId}
        onPointerDown={
          isCharmsStep
            ? (e) => {
                mainDragId.current = c.instanceId;
                (e.target as Element).setPointerCapture?.(e.pointerId);
              }
            : undefined
        }
        className={`group absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 touch-none ${
          isCharmsStep ? "cursor-grab active:cursor-grabbing" : "pointer-events-none"
        }`}
        style={{ left: `${c.x}%`, top: `${c.y}%` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={charmEntries.find((e) => e.variantId === c.variantId)?.imageUrl}
          alt={c.design}
          className="h-full w-full object-contain drop-shadow-md pointer-events-none"
        />
        {isCharmsStep && (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => removeMainCharm(c.instanceId)}
            className="absolute -top-1.5 -right-1.5 hidden h-4 w-4 items-center justify-center rounded-full bg-[var(--ink)] text-white text-[10px] leading-none group-hover:flex"
          >
            ×
          </button>
        )}
      </div>
    );
  }

  const notebooksChosen = notebookCount(selection.notebooks);
  const notebooksComplete = notebooksChosen === NOTEBOOKS_PER_JOURNAL;
  const notebookSlots: (string | null)[] = [
    ...Object.entries(selection.notebooks).flatMap(([design, count]) => Array(count).fill(design)),
  ];
  while (notebookSlots.length < NOTEBOOKS_PER_JOURNAL) notebookSlots.push(null);

  function updateSelection(updates: Partial<JournalSelection>) {
    setSelection((prev) => ({ ...prev, ...updates }));
  }

  function handleCategoryChange(next: CoverCategory) {
    setCategory(next);
    const fallback = buildCoverEntries(products).find((c) => c.category === next);
    if (fallback) updateSelection({ cover: fallback.handle });
  }

  function handleCordChange(cord: string) {
    // This is always a deliberate user choice, so it overrides any cord
    // that was only auto-picked to make a pen holder's variant resolve.
    setCordAutoSelected(false);
    if (cord === "none") {
      // Patch requires a cord, and a pen holder can't exist without one
      // either (no such Shopify variant) — both reset along with it.
      updateSelection({ cord, patch: "none", penHolder: "none", edge: false });
    } else {
      updateSelection({ cord });
    }
  }

  function handlePenHolderChange(penHolder: JournalSelection["penHolder"]) {
    if (penHolder === "none") {
      updateSelection({ penHolder, edge: false });
      return;
    }
    // Pen holder is selectable without a cord in the UI, but Shopify only
    // has pen-holder variants paired with an actual cord color — auto-pick
    // the first one behind the scenes so a real variant always resolves.
    // Patch stays locked until the user picks a cord themselves.
    if (selection.cord === "none") {
      const fallbackCord = buildCordEntries(product, swatchColors.string)[0]?.label;
      if (fallbackCord) {
        setCordAutoSelected(true);
        updateSelection({ penHolder, cord: fallbackCord });
        return;
      }
    }
    updateSelection({ penHolder });
  }

  function goNext() {
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function goBack() {
    setStep((s) => Math.max(s - 1, 0));
  }

  // The journal/notebook products are intentionally kept unpublished (Draft)
  // in Shopify — they're internal components, not meant to be found or
  // bought outside this customizer. That means the storefront's regular
  // /cart/add.js rejects them. Instead we create a Shopify Draft Order via
  // the Admin API (which can include draft/unpublished variants) and send
  // the customer straight to its hosted invoice/payment page.
  async function handleAddToCart() {
    const { items, attributes } = buildCartItems(variant, charmProduct, patchProduct, selection, window.location.origin);

    setCartError(null);
    setAddingToCart(true);
    try {
      const res = await fetch("/api/draft-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, attributes }),
      });
      const data = await res.json();
      if (!res.ok || !data.invoiceUrl) {
        setAddingToCart(false);
        setCartError(data.message ?? "Something went wrong adding your journal to the cart. Please try again.");
        return;
      }
      // Show a confirmation modal (preview + design link) before sending the
      // customer off to pay, rather than redirecting immediately.
      setAddingToCart(false);
      setDesignLinkCopied(false);
      setOrderConfirm({ invoiceUrl: data.invoiceUrl, designUrl: buildDesignUrl(window.location.origin, selection) });
    } catch {
      setAddingToCart(false);
      setCartError("Something went wrong adding your journal to the cart. Please try again.");
    }
  }

  function handleConfirmCheckout() {
    if (!orderConfirm) return;
    // Navigate the top-level page (not just this iframe) to the hosted
    // Shopify checkout page for the draft order.
    const target = window.parent === window ? window : window.top ?? window;
    target.location.href = orderConfirm.invoiceUrl;
  }

  async function handleCopyDesignLink() {
    if (!orderConfirm) return;
    try {
      await navigator.clipboard.writeText(orderConfirm.designUrl);
      setDesignLinkCopied(true);
      setTimeout(() => setDesignLinkCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) — link is still
      // reachable via the "View full design" button, so fail silently.
    }
  }

  // Cord is the one required add-on (per client feedback) — patch, pen
  // holder, corner edge, and charms all stay optional.
  const canContinue =
    (step !== JOURNAL_COVERS_STEP || selection.cord !== "none") && (step !== NOTEBOOKS_STEP || notebooksComplete);
  const continueDisabledReason =
    step === JOURNAL_COVERS_STEP && selection.cord === "none"
      ? "Pick a string color first"
      : step === NOTEBOOKS_STEP && !notebooksComplete
        ? `Pick ${NOTEBOOKS_PER_JOURNAL - notebooksChosen} more notebook${NOTEBOOKS_PER_JOURNAL - notebooksChosen > 1 ? "s" : ""} to continue`
        : null;
  const showBackSide = step === PREVIEW_STEP;
  const showNotebookPreview = step === NOTEBOOKS_STEP || step === PREVIEW_STEP;

  if (isDev && mobilePreview) {
    const embedSrc = `/mobile-preview?theme=${theme}&background=${background}`;
    return (
      <div className="min-h-screen w-full bg-[var(--page-bg)] p-4 sm:p-8 flex flex-col items-center gap-6" data-theme={theme}>
        <div className="flex w-full max-w-6xl justify-end gap-2">
          <ThemeSwitcher theme={theme} onChange={setTheme} />
          <BackgroundSwitcher mode={background} onChange={setBackground} />
          <MobileViewSwitcher enabled={mobilePreview} onChange={setMobilePreview} />
        </div>
        <div className="flex flex-1 items-center justify-center py-8">
          <div
            className="rounded-[2.5rem] shadow-2xl overflow-hidden"
            style={{ width: 390, height: 844 }}
          >
            {/* A real iframe (not a scaled-down div) — its own viewport is
                390px wide, so the customizer's `md:` breakpoints behave
                exactly as they would on an actual phone. */}
            <iframe key={embedSrc} src={embedSrc} title="Mobile preview" className="h-full w-full bg-white" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      data-theme={theme}
      className="relative isolate min-h-screen w-full overflow-hidden bg-[var(--page-bg)] p-0 md:p-8 flex flex-col items-center justify-start md:justify-center gap-4 pb-28 md:pb-8"
    >
      {/* On an actual small viewport this is a full-bleed mobile page — the
          floating-card treatment (padding, rounded corners, shadow, wallpaper
          backdrop, dev toolbar) is a desktop presentation and only applies
          from md up. */}
      {background === "wallpaper" && (
        <div
          className="wallpaper-layer -z-10 hidden md:block"
          style={{ backgroundImage: `url(${WALLPAPER_URL[theme]})` }}
          aria-hidden
        />
      )}
      <div className="w-full max-w-6xl md:rounded-[var(--radius-card)] bg-[var(--card-bg)] md:shadow-2xl overflow-hidden">
        {/* header / stepper */}
        <header className="flex items-center justify-between gap-6 border-b border-[var(--border)] px-6 sm:px-10 py-5">
          <nav className="hidden shrink-0 items-center gap-6 md:flex">
            {STEPS.map((label, i) => (
              <button key={label} type="button" onClick={() => setStep(i)} className="flex items-center gap-2 text-sm">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-[var(--radius-chip)] text-xs font-medium ${
                    i === step
                      ? "bg-[var(--accent)] text-white"
                      : i < step
                        ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                        : "bg-[var(--surface-pill)] text-[var(--faint)]"
                  }`}
                >
                  {theme === "atelier" ? ROMAN_NUMERALS[i] ?? i + 1 : i + 1}
                </span>
                <span className={i === step ? "text-[var(--ink)] font-medium" : "text-[var(--faint)]"}>{label}</span>
              </button>
            ))}
          </nav>

          <div className="flex min-w-0 flex-1 justify-end text-right">
            <div>
              <div className="text-xs text-[var(--faint)]">Total</div>
              <div className="text-lg font-semibold text-[var(--ink)] font-heading">{format(total)}</div>
            </div>
          </div>
        </header>

        <div
          ref={setBodyEl}
          // The measured-height animation + capped/scrollable panes are a
          // desktop-only technique (see the two-pane layout below) — scoped
          // to `md:` via a CSS var so mobile stays in normal document flow
          // with a single scroll owner (the page), instead of being locked
          // to a stale pinned height with its own clipped scroll islands.
          style={bodyHeight !== undefined ? ({ "--jc-body-h": `${bodyHeight}px` } as CSSProperties) : undefined}
          className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] md:max-h-[70vh] md:overflow-hidden md:h-[var(--jc-body-h)] md:transition-[height] md:duration-300 md:ease-in-out"
        >
          {/* preview */}
          <div className="flex flex-col items-center md:overflow-y-auto bg-[var(--surface-panel)] p-10 min-h-[420px]">
            {/* `my-auto` (not `justify-center` on the parent) so this block
                centers vertically when there's spare room, but — unlike
                flex `justify-center` — still aligns to the top and scrolls
                normally instead of clipping when it's taller than the panel. */}
            <div className="flex flex-col items-center gap-6 my-auto">
            <div
              onPointerMove={isCharmsStep ? handleMainCharmPointerMove : undefined}
              onPointerUp={isCharmsStep ? handleMainCharmPointerUp : undefined}
              className={
                // The side (spine) view is much narrower than front/back, so
                // sizing it off the same fixed width as front/back leaves it
                // tiny with huge empty space above/below. Sized off height
                // instead — close to the full preview panel. This can
                // overflow the panel on short viewports (scroll appears) —
                // accepted tradeoff, prioritizing a large image over never
                // scrolling here.
                mainView === "side"
                  ? "relative mx-auto h-[min(65vh,560px)] aspect-[560/660]"
                  : "relative flex w-full max-w-[360px] aspect-[560/660]"
              }
            >
              {mainView === "side" ? (
                // The side (spine) view is much narrower than front/back — render it
                // inside an inner strip sized to the same 200:660 ratio, centered in
                // the same frame, so it lines up with the small canvases in CharmsStep
                // and charm sizing stays consistent across views. Drag/drop handlers
                // live on this inner strip (not the outer box) since it's the strip's
                // bounds — not the wider outer frame — that match the visible artwork.
                <div
                  ref={previewSideRef}
                  onDragOver={isCharmsStep ? handleMainDragOver : undefined}
                  onDrop={isCharmsStep ? handleMainDrop : undefined}
                  className="relative mx-auto h-full"
                  style={{ width: `${(200 / 560) * 100}%` }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={mainImageSrc}
                    alt="Journal preview"
                    className="h-full w-full object-contain preview-shadow transition-opacity duration-200 pointer-events-none"
                  />
                  {mainCharms.map(renderMainCharmMarker)}
                </div>
              ) : (
                <div
                  ref={previewFrontBackRef}
                  onDragOver={isCharmsStep ? handleMainDragOver : undefined}
                  onDrop={isCharmsStep ? handleMainDrop : undefined}
                  className="relative h-full w-full"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={mainImageSrc}
                    alt="Journal preview"
                    className="h-full w-full object-contain preview-shadow transition-opacity duration-200 pointer-events-none"
                  />
                  {mainView === "front" && selection.patch !== "none" && (
                    <div
                      className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
                      style={{
                        left: `${PATCH_POSITION.x}%`,
                        top: `${PATCH_POSITION.y}%`,
                        width: `${PATCH_POSITION.sizePercent}%`,
                        aspectRatio: "1",
                      }}
                    >
                      <PatchIcon shape={selection.patch} className="h-full w-full drop-shadow-md" />
                    </div>
                  )}
                  {mainCharms.map(renderMainCharmMarker)}
                </div>
              )}
            </div>

            {isCharmsStep && (
              <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--faint)]">
                {mainView} view
              </span>
            )}

            {showNotebookPreview && (
              <div className="w-full max-w-[360px]">
                <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--faint)]">Inside</span>
                <div className="mt-2 grid grid-cols-3 items-start gap-4 rounded-[var(--radius-panel)] bg-[var(--surface-panel-2)] p-4">
                  {notebookSlots.map((design, i) => (
                    <div key={i} className="flex flex-col items-center gap-2">
                      <div className="relative h-44 w-full">
                        {design ? (
                          <>
                            {/* stacked-page effect behind the top sheet */}
                            <div className="absolute inset-x-1.5 top-1.5 h-full rounded-md bg-[#e7e1d3]" />
                            <div className="absolute inset-x-[3px] top-[3px] h-full rounded-md bg-[#f2ede2]" />
                            <div className="relative h-full w-full">
                              <NotebookIcon design={design} size="lg" />
                            </div>
                          </>
                        ) : (
                          <div className="flex h-full w-full items-center justify-center rounded-md border border-dashed border-[var(--faint)] text-center text-[9px] leading-tight text-[var(--faint)]">
                            Choose a notebook
                          </div>
                        )}
                      </div>
                      <span className="text-[11px] font-medium text-[var(--muted)]">
                        {design ? design.replace(" Notebook", "") : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {showBackSide && (
              <div className="flex items-start gap-6">
                <div className="flex flex-col items-center gap-1.5">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--faint)]">Back</span>
                  <div className="relative w-[100px] aspect-[560/660] rounded-lg overflow-hidden shadow-md">
                    {backImageSrc && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={backImageSrc} alt="Back preview" className="h-full w-full object-contain" />
                    )}
                    {backCharms.map((c) => (
                      <img
                        key={c.instanceId}
                        src={charmEntries.find((e) => e.variantId === c.variantId)?.imageUrl}
                        alt={c.design}
                        className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 object-contain drop-shadow pointer-events-none"
                        style={{ left: `${c.x}%`, top: `${c.y}%` }}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--faint)]">Side</span>
                  <div className="relative w-[52px] aspect-[200/660] rounded-lg overflow-hidden shadow-md">
                    {sideImageSrc && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={sideImageSrc} alt="Side preview" className="h-full w-full object-contain" />
                    )}
                    {sideCharms.map((c) => (
                      <img
                        key={c.instanceId}
                        src={charmEntries.find((e) => e.variantId === c.variantId)?.imageUrl}
                        alt={c.design}
                        className="absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 object-contain drop-shadow pointer-events-none"
                        style={{ left: `${c.x}%`, top: `${c.y}%` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
            </div>
          </div>

          {/* options */}
          <div className="md:overflow-y-auto px-6 sm:px-10 py-6">
          <div key={step} className="step-fade-in">
            {step === 0 && (
              <>
                <CoverStep
                  products={products}
                  cover={selection.cover}
                  category={category}
                  onCategoryChange={handleCategoryChange}
                  onCoverChange={(cover) => updateSelection({ cover })}
                />
                <div className="mt-6 border-t border-[var(--border)] pt-6">
                  <CordStep
                    product={product}
                    cord={selection.cord}
                    onCordChange={handleCordChange}
                    swatchByLabel={swatchColors.string}
                  />
                </div>
                <div className="mt-6 border-t border-[var(--border)] pt-6">
                  <PatchStep
                    patchProduct={patchProduct}
                    cordSelected={selection.cord !== "none" && !cordAutoSelected}
                    patch={selection.patch}
                    onPatchChange={(patch) => updateSelection({ patch })}
                  />
                </div>
              </>
            )}
            {step === CHARMS_STEP && (
              <CharmsStep
                product={product}
                charmProduct={charmProduct}
                selection={selection}
                journalImageUrl={imageSrc}
                onChange={(charms) => updateSelection({ charms })}
                activeSide={charmView}
                onSelectSide={setCharmView}
              />
            )}
            {step === ACCESSORIES_STEP && (
              <PenHolderStep
                product={product}
                selection={selection}
                onPenHolderChange={handlePenHolderChange}
                onEdgeChange={(edge) => updateSelection({ edge })}
                cordSwatchByLabel={swatchColors.string}
                penHolderSwatchByLabel={swatchColors.penHolder}
              />
            )}
            {step === NOTEBOOKS_STEP && (
              <NotebooksStep
                notebookProduct={notebookProduct}
                notebooks={selection.notebooks}
                onChange={(notebooks) => updateSelection({ notebooks })}
              />
            )}
            {step === PREVIEW_STEP && (
              <PreviewStep
                products={products}
                product={product}
                charmProduct={charmProduct}
                patchProduct={patchProduct}
                selection={selection}
                onAddToCart={handleAddToCart}
                adding={addingToCart}
                error={cartError}
              />
            )}
          </div>
          </div>
        </div>

        {/* footer — same layout across styles; the Continue button's own
            border/shadow/motion (see .btn-continue in globals.css) is what
            tells the styles apart, not where it sits. On mobile, Back/
            Continue are replaced by the fixed side arrows + fixed bottom
            total bar below, so this whole footer is desktop-only. */}
        <footer className="hidden md:flex items-center justify-between gap-4 border-t border-[var(--border)] px-6 sm:px-10 py-5">
          <div className="flex items-center gap-4">
            <CurrencySwitcher />
            <button
              type="button"
              onClick={goBack}
              disabled={step === 0}
              className="text-sm font-medium text-[var(--muted)] disabled:opacity-0"
            >
              ← Back
            </button>
          </div>
          {step < STEPS.length - 1 ? (
            <DisabledHint message={!canContinue ? continueDisabledReason : null} className="hidden md:inline-flex">
              <button
                type="button"
                onClick={goNext}
                disabled={!canContinue}
                className="btn-continue rounded-[var(--radius-button)] bg-[var(--accent)] px-8 py-3 text-white font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[var(--accent)]"
              >
                Continue →
              </button>
            </DisabledHint>
          ) : (
            <span className="hidden md:inline text-sm text-[var(--faint)]">Ready to add to cart</span>
          )}
        </footer>
      </div>

      {/* Mobile-only fixed bottom bar — Back/Continue on top, currency +
          total below. Always pinned so both stay reachable no matter how
          far the page is scrolled. Natural height (~112px, two rows + gap +
          padding) matches the outer wrapper's pb-28 below, so no
          page-background gap ever shows through once scrolled to the end. */}
      <div className="md:hidden fixed inset-x-0 bottom-0 z-40 flex flex-col justify-center gap-2 border-t border-[var(--border)] bg-[var(--card-bg)] px-4 py-3 shadow-[0_-12px_28px_-8px_rgba(0,0,0,0.35)]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={goBack}
            disabled={step === 0}
            className="flex-1 rounded-[var(--radius-button)] border border-[var(--border)] py-2.5 text-sm font-medium text-[var(--muted)] transition-opacity disabled:opacity-40"
          >
            ← Back
          </button>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={goNext}
              disabled={!canContinue}
              className="btn-continue flex-[2] rounded-[var(--radius-button)] bg-[var(--accent)] py-2.5 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-40"
            >
              Continue →
            </button>
          ) : (
            <span className="flex-[2] text-center text-sm text-[var(--faint)]">Ready to add to cart</span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <CurrencySwitcher />
          <div className="text-right">
            <div className="text-xs text-[var(--faint)]">Total</div>
            <div className="text-base font-semibold text-[var(--ink)] font-heading">{format(total)}</div>
          </div>
        </div>
      </div>

      {/* Mobile-only step nav: fixed, vertically-centered arrows at the
          screen edges instead of a Back/Continue pair in the footer. */}
      <button
        type="button"
        onClick={goBack}
        disabled={step === 0}
        aria-label="Previous step"
        className="md:hidden fixed left-3 top-1/2 z-50 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card-bg)] text-[var(--accent)] shadow-xl transition-opacity disabled:opacity-0 disabled:pointer-events-none"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
          <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <button
        type="button"
        onClick={goNext}
        disabled={step === STEPS.length - 1 || !canContinue}
        aria-label="Next step"
        className={`md:hidden fixed right-3 top-1/2 z-50 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card-bg)] text-[var(--accent)] shadow-xl transition-opacity ${
          step === STEPS.length - 1 ? "opacity-0 pointer-events-none" : !canContinue ? "opacity-40 pointer-events-none" : ""
        }`}
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
          <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {isDev && (
        <div className="hidden md:flex w-full max-w-6xl justify-end gap-2">
          <ThemeSwitcher theme={theme} onChange={setTheme} />
          <BackgroundSwitcher mode={background} onChange={setBackground} />
          <MobileViewSwitcher enabled={mobilePreview} onChange={setMobilePreview} />
        </div>
      )}

      {orderConfirm && (
        <OrderConfirmModal
          imageSrc={imageSrc}
          patch={selection.patch}
          frontCharms={frontCharms}
          charmEntries={charmEntries}
          rows={orderConfirmRows}
          formattedTotal={format(total)}
          designUrl={orderConfirm.designUrl}
          copied={designLinkCopied}
          onCopyLink={handleCopyDesignLink}
          onEdit={() => setOrderConfirm(null)}
          onConfirm={handleConfirmCheckout}
        />
      )}
    </div>
  );
}
