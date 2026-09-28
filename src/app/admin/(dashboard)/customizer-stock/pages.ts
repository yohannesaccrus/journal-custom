import { CZ_STOCK_PATH } from "@/lib/admin/feature-flags";
import type { CzSectionId } from "./data";

/**
 * The Customizer Stock sub-pages: the sidebar's sub-menu, the Overview's category cards and each
 * page's sections all come from this one list.
 */
export const CZ_PAGES = [
  { slug: "covers", title: "Covers, Strings & Patches", sections: ["cover", "string", "patch"], withProducts: false },
  // 88 charms: only the first size starts open, so the page doesn't open on three long tables.
  { slug: "charms", title: "Charms", sections: ["charm-S", "charm-M", "charm-L"], withProducts: false, open: ["charm-S"] },
  { slug: "contents", title: "Contents & Accessories", sections: ["notebook", "corner", "pen"], withProducts: true },
] as const satisfies readonly {
  slug: string;
  title: string;
  sections: readonly CzSectionId[];
  withProducts: boolean;
  /** Sections open on load; all of them when left out. */
  open?: readonly CzSectionId[];
}[];

export type CzPage = (typeof CZ_PAGES)[number];
export const czPageHref = (slug: string) => `${CZ_STOCK_PATH}/${slug}`;
export const czPage = (slug: CzPage["slug"]) => CZ_PAGES.find((p) => p.slug === slug)!;
