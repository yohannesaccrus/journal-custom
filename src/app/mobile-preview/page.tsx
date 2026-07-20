import { JournalCustomizer } from "@/components/JournalCustomizer";
import { fetchCharmProduct, fetchJournalProducts, fetchNotebookProduct, fetchPatchProduct } from "@/lib/shopify-admin";
import type { BackgroundMode } from "@/components/BackgroundSwitcher";
import type { Theme } from "@/components/ThemeSwitcher";

const THEME_IDS: Theme[] = ["heritage", "studio", "atelier"];

interface MobilePreviewProps {
  searchParams: Promise<{ theme?: string; background?: string }>;
}

/**
 * Kept as its own route (instead of a query param on "/") so the real
 * storefront-embedded page stays statically prerendered — this route is the
 * dev-only "Mobile View" toggle's <iframe> target and is fine to render
 * dynamically per request.
 */
export default async function MobilePreview({ searchParams }: MobilePreviewProps) {
  const [products, charmProduct, notebookProduct, patchProduct, params] = await Promise.all([
    fetchJournalProducts(),
    fetchCharmProduct(),
    fetchNotebookProduct(),
    fetchPatchProduct(),
    searchParams,
  ]);

  if (!charmProduct) {
    throw new Error("Charm product not found in Shopify (expected a product tagged 'charm')");
  }
  if (!notebookProduct) {
    throw new Error("Notebook product not found in Shopify (expected a product tagged 'notebook')");
  }
  if (!patchProduct) {
    throw new Error("Patch product not found in Shopify (expected a product tagged 'patch')");
  }

  const initialTheme = THEME_IDS.find((t) => t === params.theme);
  const initialBackground: BackgroundMode | undefined =
    params.background === "wallpaper" || params.background === "plain" ? params.background : undefined;

  return (
    <>
      {/* This page only ever renders inside the "Mobile View" phone-frame
          <iframe> — hiding its scrollbar keeps the frame looking like an
          actual phone instead of a scrollable browser pane. Scrolling itself
          still works via touch/wheel, it's just not drawn. */}
      <style>{`
        html, body { scrollbar-width: none; }
        html::-webkit-scrollbar, body::-webkit-scrollbar { display: none; width: 0; height: 0; }
      `}</style>
      <JournalCustomizer
        products={products}
        charmProduct={charmProduct}
        notebookProduct={notebookProduct}
        patchProduct={patchProduct}
        hideDevControls
        initialTheme={initialTheme}
        initialBackground={initialBackground}
      />
    </>
  );
}
