import { JournalCustomizer } from "@/components/JournalCustomizer";
import { fetchCharmProduct, fetchJournalProducts, fetchNotebookProduct, fetchSwatchColors } from "@/lib/shopify-admin";

export default async function Home() {
  const [products, charmProduct, notebookProduct, swatchColors] = await Promise.all([
    fetchJournalProducts(),
    fetchCharmProduct(),
    fetchNotebookProduct(),
    fetchSwatchColors(),
  ]);

  if (!charmProduct) {
    throw new Error("Charm product not found in Shopify (expected a product tagged 'charm')");
  }
  if (!notebookProduct) {
    throw new Error("Notebook product not found in Shopify (expected a product tagged 'notebook')");
  }

  return (
    <JournalCustomizer
      products={products}
      charmProduct={charmProduct}
      notebookProduct={notebookProduct}
      swatchColors={swatchColors}
    />
  );
}
