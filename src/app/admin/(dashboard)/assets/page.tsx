import { fetchAssetProducts } from "@/lib/admin/shopify-admin-data";
import { AssetsPageBody } from "@/components/admin/AssetsPageBody";

export default async function AdminAssetsPage() {
  const products = await fetchAssetProducts();

  const coverImage =
    products.find((p) => /cover/i.test(p.title))?.variants.find((v) => v.image)?.image?.url ??
    products.flatMap((p) => p.variants).find((v) => v.image)?.image?.url ??
    null;

  return (
    <div>
      <h1 className="text-2xl font-serif">Assets & Stock</h1>
      <p className="mt-1 text-sm text-[#6b6a63]">
        Manage every internal component and add-on used by the journal customizer — edit stock, prices, and
        variants.
      </p>

      <AssetsPageBody products={products} coverImage={coverImage} />
    </div>
  );
}
