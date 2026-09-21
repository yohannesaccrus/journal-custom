"use client";

import { buildCordEntries, EDGE_LABEL, EDGE_VALUES, isEdgeInStock, resolveVariant } from "@/lib/catalog";
import type { PenHolderEntry } from "@/lib/catalog";
import type { ShopifyJournalProduct, ShopifyVariant } from "@/lib/shopify-admin";
import { useCurrencyFormat } from "@/components/CurrencyContext";
import { useTranslation } from "@/components/LocaleContext";
import { Swatch } from "@/components/Swatch";
import { DisabledHint } from "@/components/DisabledHint";
import type { JournalSelection } from "@/lib/types";

const EDGE_SWATCH: Record<Exclude<JournalSelection["edge"], "none">, string> = {
  gold: "#c9a227",
  silver: "#c0c0c0",
};

interface PenHolderStepProps {
  product: ShopifyJournalProduct;
  selection: JournalSelection;
  onPenHolderChange: (slug: JournalSelection["penHolder"]) => void;
  onEdgeChange: (edge: JournalSelection["edge"]) => void;
  cordSwatchByLabel?: Record<string, string>;
  /** Standalone pen holder add-on options (Black/Brown) -- empty when the store has no such product, which hides the section. */
  penHolderEntries: PenHolderEntry[];
  pouchVariant?: ShopifyVariant;
  onPouchChange: (pouch: boolean) => void;
}

export function PenHolderStep({
  product,
  selection,
  onPenHolderChange,
  onEdgeChange,
  cordSwatchByLabel,
  penHolderEntries,
  pouchVariant,
  onPouchChange,
}: PenHolderStepProps) {
  const { format } = useCurrencyFormat();
  const { t } = useTranslation();
  // Corner-edge variants only exist paired with an actual cord color — picking
  // an edge auto-selects the first cord behind the scenes (see handleEdgeChange
  // in JournalCustomizer). Price/stock previews here need that same
  // substitution, or resolving a "No Cord + Corner Edge" variant that doesn't
  // exist would throw before the user even clicks.
  const effectiveCord =
    selection.cord !== "none" ? selection.cord : buildCordEntries(product, cordSwatchByLabel)[0]?.label ?? selection.cord;
  const edgeStockByColor = Object.fromEntries(
    EDGE_VALUES.map((color) => [color, isEdgeInStock(product, effectiveCord, color, selection.patch)])
  ) as Record<Exclude<JournalSelection["edge"], "none">, boolean>;

  const edgePriceDelta = (edge: JournalSelection["edge"]) => {
    const cord = edge === "none" ? selection.cord : effectiveCord;
    return Number(resolveVariant(product, { ...selection, cord, edge }).price);
  };
  const baseEdgePrice = edgePriceDelta("none");

  return (
    <div className="step-fade-in">
      {penHolderEntries.length > 0 && (
        <>
          <h2 className="text-xl font-heading text-[var(--ink)]">{t("penHolder.title")}</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">{t("penHolder.subtitle")}</p>

          <div className="mt-4 flex flex-wrap gap-4">
            <Swatch
              label={t("penHolder.noPenHolder")}
              selected={selection.penHolder === "none"}
              onClick={() => onPenHolderChange("none")}
              color="#ffffff"
            />
            {penHolderEntries.map((o) => (
              <DisabledHint key={o.slug} message={!o.inStock ? t("common.outOfStock") : null}>
                <Swatch
                  label={o.label}
                  selected={selection.penHolder === o.slug}
                  onClick={() => onPenHolderChange(o.slug)}
                  thumbnail={o.thumbnail}
                  color={o.thumbnail ? undefined : o.swatch}
                  priceLabel={o.price > 0 ? `+${format(o.price, "pouch")}` : t("penHolder.free")}
                  disabled={!o.inStock}
                />
              </DisabledHint>
            ))}
          </div>
        </>
      )}

      <div className={penHolderEntries.length > 0 ? "mt-5 border-t border-[var(--border)] pt-5" : ""}>
        <h3 className="text-base font-heading text-[var(--ink)]">{t("penHolder.cornerEdgeAccents")}</h3>
        <p className="mt-1 text-xs text-[var(--muted)]">
          {t("penHolder.cornerEdgeSubtitle")}
        </p>
        <div className="mt-3 flex flex-wrap gap-4">
          <Swatch label={t("penHolder.noEdge")} selected={selection.edge === "none"} onClick={() => onEdgeChange("none")} color="#ffffff" />
          {EDGE_VALUES.map((color) => {
            const inStockColor = edgeStockByColor[color];
            const delta = edgePriceDelta(color) - baseEdgePrice;
            return (
              <DisabledHint key={color} message={!inStockColor ? t("common.outOfStock") : null}>
                <Swatch
                  label={EDGE_LABEL[color]}
                  selected={selection.edge === color}
                  onClick={() => onEdgeChange(color)}
                  color={EDGE_SWATCH[color]}
                  priceLabel={delta > 0 ? `+${format(delta)}` : undefined}
                  disabled={!inStockColor}
                />
              </DisabledHint>
            );
          })}
        </div>
      </div>

      {pouchVariant && (
        <div className="mt-5 border-t border-[var(--border)] pt-5">
          <h3 className="text-base font-heading text-[var(--ink)]">{t("penHolder.protectivePouch")}</h3>
          <p className="mt-1 text-xs text-[var(--muted)]">{t("penHolder.pouchSubtitle")}</p>
          <div className="mt-3 flex flex-wrap gap-4">
            <Swatch label={t("penHolder.noPouch")} selected={!selection.pouch} onClick={() => onPouchChange(false)} color="#ffffff" />
            <DisabledHint message={pouchVariant.inventoryQuantity <= 0 ? t("common.outOfStock") : null}>
              <Swatch
                label={t("penHolder.plasticPouch")}
                selected={selection.pouch}
                onClick={() => onPouchChange(true)}
                thumbnail={pouchVariant.image?.url}
                priceLabel={Number(pouchVariant.price) > 0 ? `+${format(Number(pouchVariant.price), "pouch")}` : t("penHolder.free")}
                disabled={pouchVariant.inventoryQuantity <= 0}
              />
            </DisabledHint>
          </div>
        </div>
      )}
    </div>
  );
}
