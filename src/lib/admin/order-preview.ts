import "server-only";
import {
  buildCharmEntries,
  buildCoverEntries,
  resolveFrontImage,
  resolveSideImage,
  resolveVariant,
  type CharmEntry,
} from "@/lib/catalog";
import type { ShopifyJournalProduct } from "@/lib/shopify-admin";
import type { JournalSelection } from "@/lib/types";
import type { DesignSliderView } from "@/components/DesignSlider";

export interface OrderJournalCharm {
  instanceId: string;
  design: string;
  side: string;
  imageUrl?: string;
  priceIDR?: number;
}

export interface OrderJournalPreview {
  coverLabel: string;
  views: DesignSliderView[];
  charmEntries: CharmEntry[];
  patch: JournalSelection["patch"];
  specRows: { label: string; value: string }[];
  charms: OrderJournalCharm[];
}

/**
 * Rebuilds the exact same view model the customer-facing `/design` page uses
 * (see `app/design/page.tsx`), so the admin Orders page can render the same
 * front/back/side slider inline in a modal instead of only linking out.
 */
export function buildOrderJournalPreview(
  spec: JournalSelection,
  products: ShopifyJournalProduct[],
  charmProduct: ShopifyJournalProduct | undefined
): OrderJournalPreview | null {
  const product = products.find((p) => p.handle === spec.cover);
  if (!product || !charmProduct) return null;

  let variant;
  try {
    variant = resolveVariant(product, spec);
  } catch {
    return null;
  }

  const cover = buildCoverEntries(products).find((c) => c.handle === product.handle);
  const charmEntries = buildCharmEntries(charmProduct);
  const frontImage = resolveFrontImage(variant);
  const backImage = resolveSideImage(product, "back", spec);
  const sideImage = resolveSideImage(product, "side", spec);

  const specRows = [
    { label: "Cover", value: cover?.label ?? product.title },
    { label: "String", value: spec.cord !== "none" ? spec.cord : "None" },
    {
      label: "Patch",
      value: spec.patch === "none" ? "None" : spec.patch.charAt(0).toUpperCase() + spec.patch.slice(1),
    },
    {
      label: "Pen holder",
      value: spec.penHolder === "none" ? "None" : spec.penHolder === "black" ? "Black" : "Brown",
    },
    { label: "Corner edge", value: spec.edge && spec.penHolder !== "none" ? "Yes" : "No" },
    {
      label: "Notebooks",
      value:
        Object.keys(spec.notebooks).length === 0
          ? "None chosen"
          : Object.entries(spec.notebooks)
              .map(([design, count]) => `${count}× ${design}`)
              .join(", "),
    },
  ];

  return {
    coverLabel: cover?.label ?? product.title,
    views: [
      { label: "Front", image: frontImage, charms: spec.charms.filter((c) => c.side === "front"), charmSize: "h-10 w-10" },
      { label: "Back", image: backImage, charms: spec.charms.filter((c) => c.side === "back"), charmSize: "h-8 w-8" },
      { label: "Side", image: sideImage, charms: spec.charms.filter((c) => c.side === "side"), charmSize: "h-6 w-6" },
    ],
    charmEntries,
    patch: spec.patch,
    specRows,
    charms: spec.charms.map((c) => {
      const entry = charmEntries.find((e) => e.variantId === c.variantId);
      return {
        instanceId: c.instanceId,
        design: c.design,
        side: c.side,
        imageUrl: entry?.imageUrl,
        priceIDR: entry?.price,
      };
    }),
  };
}
