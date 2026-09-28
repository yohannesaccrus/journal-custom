import { CZ_STOCK_PATH } from "@/lib/admin/feature-flags";
import type { CzSectionId } from "./data";

/**
 * The Customizer Stock sub-pages: the sidebar's sub-menu, the Overview's category cards and each
 * page's sections all come from this one list.
 */
export const CZ_PAGES = [
  { slug: "covers", title: "Covers, Strings & Patches", sections: ["cover", "string", "patch"], withProducts: false },
  { slug: "charms", title: "Charms", sections: ["charm-S", "charm-M", "charm-L"], withProducts: false },
  { slug: "contents", title: "Contents & Accessories", sections: ["notebook", "corner", "pen"], withProducts: true },
] as const satisfies readonly { slug: string; title: string; sections: readonly CzSectionId[]; withProducts: boolean }[];

export type CzPage = (typeof CZ_PAGES)[number];
export const czPageHref = (slug: string) => `${CZ_STOCK_PATH}/${slug}`;
export const czPage = (slug: CzPage["slug"]) => CZ_PAGES.find((p) => p.slug === slug)!;
