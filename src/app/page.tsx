import { JournalCustomizer } from "@/components/JournalCustomizer";
import {
  fetchCharmProduct,
  fetchJournalProducts,
  fetchNotebookProduct,
  fetchPatchProduct,
  fetchPenHolderProduct,
  fetchPouchProduct,
  fetchSwatchColors,
} from "@/lib/shopify-admin";

interface HomeProps {
  searchParams: Promise<{ country?: string; lang?: string }>;
}

export default async function Home({ searchParams }: HomeProps) {
  const { country, lang } = await searchParams;
  const [products, charmProduct, notebookProduct, patchProduct, pouchProduct, penHolderProduct, swatchColors] = await Promise.all([
    fetchJournalProducts(),
    fetchCharmProduct(),
    fetchNotebookProduct(),
    fetchPatchProduct(),
    fetchPouchProduct(),
    fetchPenHolderProduct(),
    fetchSwatchColors(),
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
  if (!pouchProduct) {
    throw new Error("Pouch product not found in Shopify (expected a product tagged 'pouch')");
  }

  return (
    <JournalCustomizer
      products={products}
      charmProduct={charmProduct}
      notebookProduct={notebookProduct}
      patchProduct={patchProduct}
      pouchProduct={pouchProduct}
      penHolderProduct={penHolderProduct}
      swatchColors={swatchColors}
      country={country}
      lang={lang}
    />
  );
}
