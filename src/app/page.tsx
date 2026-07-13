import { JournalCustomizer } from "@/components/JournalCustomizer";
import { fetchCharmProduct, fetchJournalProducts, fetchNotebookProduct, fetchPatchProduct } from "@/lib/shopify-admin";

export default async function Home() {
  const [products, charmProduct, notebookProduct, patchProduct] = await Promise.all([
    fetchJournalProducts(),
    fetchCharmProduct(),
    fetchNotebookProduct(),
    fetchPatchProduct(),
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

  return (
    <JournalCustomizer
      products={products}
      charmProduct={charmProduct}
      notebookProduct={notebookProduct}
      patchProduct={patchProduct}
    />
  );
}
