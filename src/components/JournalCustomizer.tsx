"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CoverStep } from "@/components/steps/CoverStep";
import { CordStep } from "@/components/steps/CordStep";
import { PatchStep } from "@/components/steps/PatchStep";
import { PenHolderStep } from "@/components/steps/PenHolderStep";
import { CharmsStep } from "@/components/steps/CharmsStep";
import { NotebooksStep } from "@/components/steps/NotebooksStep";
import { PreviewStep } from "@/components/steps/PreviewStep";
import { NotebookIcon } from "@/components/NotebookIcon";
import { ThemeSwitcher, THEMES, type Theme } from "@/components/ThemeSwitcher";
import { BackgroundSwitcher, type BackgroundMode } from "@/components/BackgroundSwitcher";
import { MobileViewSwitcher } from "@/components/MobileViewSwitcher";
import {
  buildCharmEntries,
  buildCordEntries,
  buildCoverEntries,
  charmsTotal,
  NOTEBOOKS_PER_JOURNAL,
  notebookCount,
  patchPrice,
  resolveFrontImage,
  resolveSideImage,
  resolveVariant,
} from "@/lib/catalog";
import { buildCartItems } from "@/lib/cart";
import { formatIDR } from "@/lib/pricing";
import type { ShopifyJournalProduct } from "@/lib/shopify-admin";
import type { CharmSide, CoverCategory, JournalSelection } from "@/lib/types";

const STEPS = ["Journal Covers", "Accessories", "Charms", "Content", "Preview"] as const;
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
  // Set when this render is the phone-sized <iframe> embed the "Mobile View"
  // toggle opens (see page.tsx) — suppresses all the dev-only style controls
  // so the embed just shows the customizer itself, seeded to match whatever
  // the outer page had selected.
  hideDevControls?: boolean;
  initialTheme?: Theme;
  initialBackground?: BackgroundMode;
}

export function JournalCustomizer({
  products,
  charmProduct,
  notebookProduct,
  patchProduct,
  hideDevControls,
  initialTheme,
  initialBackground,
}: JournalCustomizerProps) {
  // The style tools (theme/background/mobile-view switchers) are always on
  // in development. In production they're normally hidden from real
  // customers, but a reviewer can unlock them on the live deployment with
  // ?styleTools=1 — that unlock then persists via localStorage so it
  // survives reloads without needing the query param every time.
  const [toolsUnlocked, setToolsUnlocked] = useState(false);
  useEffect(() => {
    if (hideDevControls) return;
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
  const bodyRef = useRef<HTMLDivElement>(null);
  const [bodyHeight, setBodyHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;

    const observer = new ResizeObserver(([entry]) => {
      setBodyHeight(entry.contentRect.height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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

  // The parent page performs the actual /cart/add.js call (same-origin with
  // the shop, so cart cookies work correctly) and reports back if it failed.
  // On success it redirects the top-level page to /checkout, which unmounts
  // this iframe — so there is no explicit "success" message to handle here.
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (!event.data || event.data.type !== "sanaya-journal-cart-error") return;
      setAddingToCart(false);
      setCartError(typeof event.data.message === "string" ? event.data.message : "Something went wrong adding this to your cart.");
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const product = useMemo(
    () => products.find((p) => p.handle === selection.cover) ?? products[0],
    [products, selection.cover]
  );
  const variant = useMemo(() => resolveVariant(product, selection), [product, selection]);
  const imageSrc = resolveFrontImage(product, variant, selection);
  const charmEntries = useMemo(() => buildCharmEntries(charmProduct), [charmProduct]);
  const total =
    Number(variant.price) + charmsTotal(charmProduct, selection.charms) + patchPrice(patchProduct, selection.patch);
  const frontCharms = selection.charms.filter((c) => c.side === "front");
  const backCharms = selection.charms.filter((c) => c.side === "back");
  const sideCharms = selection.charms.filter((c) => c.side === "side");
  const backImageSrc = resolveSideImage(product, "back", selection);
  const sideImageSrc = resolveSideImage(product, "side", selection);
  const isCharmsStep = step === 2;
  const mainView: CharmSide = isCharmsStep ? charmView : "front";
  const mainImageSrc = mainView === "front" ? imageSrc : mainView === "back" ? backImageSrc : sideImageSrc;
  const mainCharms = mainView === "front" ? frontCharms : mainView === "back" ? backCharms : sideCharms;
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
      const fallbackCord = buildCordEntries(products)[0]?.label;
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

  function handleAddToCart() {
    const items = buildCartItems(variant, charmProduct, patchProduct, selection, window.location.origin);

    if (window.parent === window) {
      // Standalone (not embedded) — no shop origin to submit the cart to.
      alert(`Add to cart payload:\n${JSON.stringify(items, null, 2)}`);
      return;
    }

    setCartError(null);
    setAddingToCart(true);
    window.parent.postMessage({ type: "sanaya-journal-add-to-cart", items }, "*");
  }

  const canContinue = step !== NOTEBOOKS_STEP || notebooksComplete;
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
      className="relative isolate min-h-screen w-full overflow-hidden bg-[var(--page-bg)] p-0 md:p-8 flex flex-col items-center justify-start md:justify-center gap-4 pb-20 md:pb-0"
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
          {/* Logo always keeps Style 1's look (Playfair, brand orange) regardless
              of the active style — it's the one constant across all three. */}
          <span
            className="text-xl tracking-[0.2em]"
            style={{ fontFamily: "var(--font-playfair), Georgia, serif", color: "#b1632f" }}
          >
            SANAYA
          </span>

          <nav className="hidden md:flex items-center gap-6">
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

          <div className="text-right">
            <div className="text-xs text-[var(--faint)]">Total</div>
            <div className="text-lg font-semibold text-[var(--ink)] font-heading">{formatIDR(total)}</div>
          </div>
        </header>

        <div
          ref={bodyRef}
          style={bodyHeight !== undefined ? { height: bodyHeight, transition: "height 300ms ease" } : undefined}
          className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] md:max-h-[70vh] overflow-hidden"
        >
          {/* preview */}
          <div className="flex flex-col items-center justify-start gap-6 overflow-y-auto bg-[var(--surface-panel)] p-10 min-h-[420px]">
            <div className="relative w-full max-w-[320px] aspect-[560/660]">
              {mainView === "side" ? (
                // The side (spine) view is much narrower than front/back — render it
                // inside an inner strip sized to the same 200:660 ratio, centered in
                // the same frame, so it lines up with the small canvases in CharmsStep
                // and charm sizing stays consistent across views.
                <div className="absolute inset-y-0 left-1/2 -translate-x-1/2" style={{ width: `${(200 / 560) * 100}%` }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={mainImageSrc}
                    alt="Journal preview"
                    className="h-full w-full object-contain preview-shadow transition-opacity duration-200"
                  />
                  {mainCharms.map((c) => (
                    <img
                      key={c.instanceId}
                      src={charmEntries.find((e) => e.variantId === c.variantId)?.imageUrl}
                      alt={c.design}
                      className="absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 object-contain drop-shadow-md pointer-events-none"
                      style={{ left: `${c.x}%`, top: `${c.y}%` }}
                    />
                  ))}
                </div>
              ) : (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={mainImageSrc}
                    alt="Journal preview"
                    className="h-full w-full object-contain preview-shadow transition-opacity duration-200"
                  />
                  {mainCharms.map((c) => (
                    <img
                      key={c.instanceId}
                      src={charmEntries.find((e) => e.variantId === c.variantId)?.imageUrl}
                      alt={c.design}
                      className="absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 object-contain drop-shadow-md pointer-events-none"
                      style={{ left: `${c.x}%`, top: `${c.y}%` }}
                    />
                  ))}
                </>
              )}
            </div>

            {isCharmsStep && (
              <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--faint)]">
                {mainView} view
              </span>
            )}

            {showNotebookPreview && (
              <div className="w-full max-w-[320px]">
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

          {/* options */}
          <div className="overflow-y-auto px-6 sm:px-10 py-6">
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
                  <CordStep products={products} cord={selection.cord} onCordChange={handleCordChange} />
                </div>
              </>
            )}
            {step === 1 && (
              <>
                <PatchStep
                  patchProduct={patchProduct}
                  cordSelected={selection.cord !== "none" && !cordAutoSelected}
                  patch={selection.patch}
                  onPatchChange={(patch) => updateSelection({ patch })}
                />
                <div className="mt-6 border-t border-[var(--border)] pt-6">
                  <PenHolderStep
                    product={product}
                    selection={selection}
                    onPenHolderChange={handlePenHolderChange}
                    onEdgeChange={(edge) => updateSelection({ edge })}
                  />
                </div>
              </>
            )}
            {step === 2 && (
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
          <button
            type="button"
            onClick={goBack}
            disabled={step === 0}
            className="text-sm font-medium text-[var(--muted)] disabled:opacity-0"
          >
            ← Back
          </button>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={goNext}
              disabled={!canContinue}
              className="btn-continue hidden md:inline-block rounded-[var(--radius-button)] bg-[var(--accent)] px-8 py-3 text-white font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[var(--accent)]"
            >
              Continue →
            </button>
          ) : (
            <span className="hidden md:inline text-sm text-[var(--faint)]">Ready to add to cart</span>
          )}
        </footer>
      </div>

      {/* Mobile-only fixed total bar — always pinned to the bottom of the
          screen so the price is visible no matter how far the page is
          scrolled. Height is explicit (h-20) and matches the outer
          wrapper's pb-20 exactly, so no page-background gap ever shows
          through above it once scrolled all the way down. */}
      <div className="md:hidden fixed inset-x-0 bottom-0 z-40 flex h-20 items-center justify-end border-t border-[var(--border)] bg-[var(--card-bg)] px-6 shadow-[0_-12px_28px_-8px_rgba(0,0,0,0.35)]">
        <div className="text-right">
          <div className="text-xs text-[var(--faint)]">Total</div>
          <div className="text-lg font-semibold text-[var(--ink)] font-heading">{formatIDR(total)}</div>
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
    </div>
  );
}
