"use client";

import { buildCordEntries, buildPenHolderEntries, EDGE_LABEL, EDGE_VALUES, isEdgeInStock, resolveVariant } from "@/lib/catalog";
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
  penHolderSwatchByLabel?: Record<string, string>;
  pouchVariant?: ShopifyVariant;
  onPouchChange: (pouch: boolean) => void;
}

export function PenHolderStep({
  product,
  selection,
  onPenHolderChange,
  onEdgeChange,
  cordSwatchByLabel,
  penHolderSwatchByLabel,
  pouchVariant,
  onPouchChange,
}: PenHolderStepProps) {
  const { format } = useCurrencyFormat();
  const { t } = useTranslation();
  const hasPenHolder = selection.penHolder !== "none";

  // Shopify only has pen-holder variants paired with an actual cord color —
  // picking a pen holder color auto-selects the first cord behind the scenes
  // (see handlePenHolderChange in JournalCustomizer). Price previews here
  // need that same substitution, or resolving a "No Cord + Pen Holder"
  // variant that doesn't exist would throw before the user even clicks.
  const effectiveCord =
    selection.cord !== "none" ? selection.cord : buildCordEntries(product, cordSwatchByLabel)[0]?.label ?? selection.cord;
  const entries = buildPenHolderEntries(product, effectiveCord, selection.patch, penHolderSwatchByLabel);
  const edgeStockByColor = Object.fromEntries(
    EDGE_VALUES.map((color) => [
      color,
      selection.penHolder !== "none" ? isEdgeInStock(product, effectiveCord, selection.penHolder, color, selection.patch) : true,
    ])
  ) as Record<Exclude<JournalSelection["edge"], "none">, boolean>;

  const priceAt = (penHolder: JournalSelection["penHolder"], edge: JournalSelection["edge"]) => {
    const cord = penHolder === "none" ? selection.cord : effectiveCord;
    return Number(resolveVariant(product, { ...selection, cord, penHolder, edge }).price);
  };

  const basePrice = priceAt("none", "none");

  return (
    <div className="step-fade-in">
      <h2 className="text-xl font-heading text-[var(--ink)]">{t("penHolder.title")}</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">{t("penHolder.subtitle")}</p>

      <div className="mt-4 flex flex-wrap gap-4">
        <Swatch
          label={t("penHolder.noPenHolder")}
          selected={selection.penHolder === "none"}
          onClick={() => onPenHolderChange("none")}
          color="#ffffff"
        />
        {entries.map((o) => {
          const slug = o.label.toLowerCase() as JournalSelection["penHolder"];
          const delta = priceAt(slug, "none") - basePrice;
          return (
            <DisabledHint key={o.label} message={!o.inStock ? t("common.outOfStock") : null}>
              <Swatch
                label={o.label}
                selected={selection.penHolder === slug}
                onClick={() => onPenHolderChange(slug)}
                color={o.swatch}
                priceLabel={delta > 0 ? `+${format(delta)}` : undefined}
                disabled={!o.inStock}
              />
            </DisabledHint>
          );
        })}
      </div>

      <div className="mt-5 border-t border-[var(--border)] pt-5">
        <h3 className="text-base font-heading text-[var(--ink)]">{t("penHolder.cornerEdgeAccents")}</h3>
        <p className="mt-1 text-xs text-[var(--muted)]">
          {t("penHolder.cornerEdgeSubtitle")}
        </p>
        <div className="mt-3 flex flex-wrap gap-4">
          <Swatch label={t("penHolder.noEdge")} selected={selection.edge === "none"} onClick={() => onEdgeChange("none")} color="#ffffff" />
          {EDGE_VALUES.map((color) => {
            const inStockColor = edgeStockByColor[color];
            const delta = priceAt(selection.penHolder, color) - priceAt(selection.penHolder, "none");
            return (
              <DisabledHint key={color} message={hasPenHolder && !inStockColor ? t("common.outOfStock") : null}>
                <Swatch
                  label={EDGE_LABEL[color]}
                  selected={selection.edge === color}
                  onClick={() => onEdgeChange(color)}
                  color={EDGE_SWATCH[color]}
                  priceLabel={hasPenHolder ? `+${format(delta)}` : undefined}
                  disabled={!hasPenHolder || !inStockColor}
                />
              </DisabledHint>
            );
          })}
        </div>
        {!hasPenHolder && (
          <p className="mt-2 text-xs text-[var(--faint)]">{t("penHolder.selectPenHolderFirst")}</p>
        )}
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
