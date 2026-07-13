"use client";

import { useEffect, useMemo, useState } from "react";
import { CoverStep } from "@/components/steps/CoverStep";
import { CordStep } from "@/components/steps/CordStep";
import { PenHolderStep } from "@/components/steps/PenHolderStep";
import { CharmsStep } from "@/components/steps/CharmsStep";
import { NotebooksStep } from "@/components/steps/NotebooksStep";
import { PreviewStep } from "@/components/steps/PreviewStep";
import { NotebookIcon } from "@/components/NotebookIcon";
import {
  buildCharmEntries,
  buildCoverEntries,
  charmsTotal,
  NOTEBOOKS_PER_JOURNAL,
  notebookCount,
  resolveSideImage,
  resolveVariant,
} from "@/lib/catalog";
import { formatIDR } from "@/lib/pricing";
import type { ShopifyJournalProduct } from "@/lib/shopify-admin";
import type { CoverCategory, JournalSelection } from "@/lib/types";

const STEPS = ["Cover", "Cord", "Pen Holder", "Charms", "Notebooks", "Preview"] as const;
const NOTEBOOKS_STEP = 4;
const PREVIEW_STEP = 5;

interface JournalCustomizerProps {
  products: ShopifyJournalProduct[];
  charmProduct: ShopifyJournalProduct;
  notebookProduct: ShopifyJournalProduct;
}

export function JournalCustomizer({ products, charmProduct, notebookProduct }: JournalCustomizerProps) {
  const [step, setStep] = useState(0);
  const [category, setCategory] = useState<CoverCategory>("classic");
  const [selection, setSelection] = useState<JournalSelection>({
    cover: buildCoverEntries(products).find((c) => c.category === "classic")?.handle ?? products[0]?.handle ?? "",
    cord: "none",
    penHolder: "none",
    edge: false,
    charms: [],
    notebooks: {},
  });

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
  const imageSrc = variant.image?.url ?? "";
  const charmEntries = useMemo(() => buildCharmEntries(charmProduct), [charmProduct]);
  const total = Number(variant.price) + charmsTotal(charmProduct, selection.charms);
  const frontCharms = selection.charms.filter((c) => c.side === "front");
  const backCharms = selection.charms.filter((c) => c.side === "back");
  const sideCharms = selection.charms.filter((c) => c.side === "side");
  const backImageSrc = resolveSideImage(product, "back", selection);
  const sideImageSrc = resolveSideImage(product, "side", selection);
  const notebooksChosen = notebookCount(selection.notebooks);
  const notebooksComplete = notebooksChosen === NOTEBOOKS_PER_JOURNAL;
  const notebookSlots: (string | null)[] = [
    ...Object.entries(selection.notebooks).flatMap(([design, count]) => Array(count).fill(design)),
  ];
  while (notebookSlots.length < NOTEBOOKS_PER_JOURNAL) notebookSlots.push(null);

  function updateSelection(patch: Partial<JournalSelection>) {
    setSelection((prev) => ({ ...prev, ...patch }));
  }

  function handleCategoryChange(next: CoverCategory) {
    setCategory(next);
    const fallback = buildCoverEntries(products).find((c) => c.category === next);
    if (fallback) updateSelection({ cover: fallback.handle });
  }

  function handleCordChange(cord: string) {
    if (cord === "none") {
      updateSelection({ cord, penHolder: "none", edge: false });
    } else {
      updateSelection({ cord });
    }
  }

  function handlePenHolderChange(penHolder: JournalSelection["penHolder"]) {
    if (penHolder === "none") {
      updateSelection({ penHolder, edge: false });
    } else {
      updateSelection({ penHolder });
    }
  }

  function goNext() {
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function goBack() {
    setStep((s) => Math.max(s - 1, 0));
  }

  function handleAddToCart() {
    // Placeholder for Shopify cart integration — variant.id is the exact
    // ProductVariant gid for the journal; each placed charm carries its own
    // ProductVariant gid (charm.variantId) to add as a separate cart line
    // with side/position stored as line item properties. Notebook selections
    // map to Sanaya Component — Notebook variant ids/quantities the same way.
    alert(
      `Added to cart:\nVariant: ${variant.id}\nSKU: ${variant.sku}\nCharms: ${selection.charms.length}\nNotebooks: ${notebooksChosen}\nTotal: ${formatIDR(total)}`
    );
  }

  const canContinue = step !== NOTEBOOKS_STEP || notebooksComplete;
  const showBackSide = step === PREVIEW_STEP;
  const showNotebookPreview = step === NOTEBOOKS_STEP || step === PREVIEW_STEP;

  return (
    <div className="min-h-[600px] bg-[#0f3d34] p-4 sm:p-8 flex items-center justify-center">
      <div className="w-full max-w-6xl rounded-3xl bg-white shadow-2xl overflow-hidden">
        {/* header / stepper */}
        <header className="flex items-center justify-between gap-6 border-b border-[#eae7de] px-6 sm:px-10 py-5">
          <span className="text-xl tracking-[0.2em] font-serif text-[#b1632f]">SANAYA</span>

          <nav className="hidden md:flex items-center gap-6">
            {STEPS.map((label, i) => (
              <button
                key={label}
                type="button"
                onClick={() => setStep(i)}
                className="flex items-center gap-2 text-sm"
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                    i === step
                      ? "bg-[#0f3d34] text-white"
                      : i < step
                        ? "bg-[#0f3d34]/10 text-[#0f3d34]"
                        : "bg-[#f2f0ea] text-[#a8a69c]"
                  }`}
                >
                  {i + 1}
                </span>
                <span className={i === step ? "text-[#1c1c1a] font-medium" : "text-[#a8a69c]"}>{label}</span>
              </button>
            ))}
          </nav>

          <div className="text-right">
            <div className="text-xs text-[#a8a69c]">Total</div>
            <div className="text-lg font-semibold text-[#1c1c1a]">{formatIDR(total)}</div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          {/* preview */}
          <div className="flex flex-col items-center justify-center gap-6 bg-[#f7f3ec] p-10 min-h-[420px]">
            <div className="relative w-full max-w-[320px] aspect-[560/660]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageSrc}
                alt="Journal preview"
                className="h-full w-full object-contain drop-shadow-xl transition-opacity duration-200"
              />
              {frontCharms.map((c) => (
                <img
                  key={c.instanceId}
                  src={charmEntries.find((e) => e.variantId === c.variantId)?.imageUrl}
                  alt={c.design}
                  className="absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 object-contain drop-shadow-md pointer-events-none"
                  style={{ left: `${c.x}%`, top: `${c.y}%` }}
                />
              ))}
            </div>

            {showNotebookPreview && (
              <div className="w-full max-w-[320px]">
                <span className="text-[11px] font-medium uppercase tracking-wide text-[#a89a80]">Inside</span>
                <div className="mt-2 grid grid-cols-3 items-start gap-4 rounded-lg bg-[#efeae0] p-4">
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
                          <div className="flex h-full w-full items-center justify-center rounded-md border border-dashed border-[#c8c2b3] text-center text-[9px] leading-tight text-[#a89a80]">
                            Choose a notebook
                          </div>
                        )}
                      </div>
                      <span className="text-[11px] font-medium text-[#6b6a63]">
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
                  <span className="text-[11px] font-medium uppercase tracking-wide text-[#a89a80]">Back</span>
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
                  <span className="text-[11px] font-medium uppercase tracking-wide text-[#a89a80]">Side</span>
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
          <div className="px-6 sm:px-10 py-10">
            {step === 0 && (
              <CoverStep
                products={products}
                cover={selection.cover}
                category={category}
                onCategoryChange={handleCategoryChange}
                onCoverChange={(cover) => updateSelection({ cover })}
              />
            )}
            {step === 1 && <CordStep products={products} cord={selection.cord} onChange={handleCordChange} />}
            {step === 2 && (
              <PenHolderStep
                product={product}
                selection={selection}
                onPenHolderChange={handlePenHolderChange}
                onEdgeChange={(edge) => updateSelection({ edge })}
              />
            )}
            {step === 3 && (
              <CharmsStep
                product={product}
                charmProduct={charmProduct}
                selection={selection}
                journalImageUrl={imageSrc}
                onChange={(charms) => updateSelection({ charms })}
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
                selection={selection}
                onAddToCart={handleAddToCart}
              />
            )}
          </div>
        </div>

        {/* footer */}
        <footer className="flex items-center justify-between gap-4 border-t border-[#eae7de] px-6 sm:px-10 py-5">
          <button
            type="button"
            onClick={goBack}
            disabled={step === 0}
            className="text-sm font-medium text-[#6b6a63] disabled:opacity-0"
          >
            ← Back
          </button>
          <div className="text-right md:hidden">
            <div className="text-xs text-[#a8a69c]">Total</div>
            <div className="text-base font-semibold text-[#1c1c1a]">{formatIDR(total)}</div>
          </div>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={goNext}
              disabled={!canContinue}
              className="rounded-full bg-[#0f3d34] px-8 py-3 text-white font-medium hover:bg-[#0c332b] transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#0f3d34]"
            >
              Continue →
            </button>
          ) : (
            <span className="hidden md:inline text-sm text-[#a8a69c]">Ready to add to cart</span>
          )}
        </footer>
      </div>
    </div>
  );
}
