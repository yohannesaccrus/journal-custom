import { JournalCustomizer } from "@/components/JournalCustomizer";
import { fetchCharmProduct, fetchJournalProducts, fetchNotebookProduct } from "@/lib/shopify-admin";

export default async function Home() {
  const [products, charmProduct, notebookProduct] = await Promise.all([
    fetchJournalProducts(),
    fetchCharmProduct(),
    fetchNotebookProduct(),
  ]);

  if (!charmProduct) {
    throw new Error("Charm product not found in Shopify (expected a product tagged 'charm')");
  }
  if (!notebookProduct) {
    throw new Error("Notebook product not found in Shopify (expected a product tagged 'notebook')");
  }

  return <JournalCustomizer products={products} charmProduct={charmProduct} notebookProduct={notebookProduct} />;
}
