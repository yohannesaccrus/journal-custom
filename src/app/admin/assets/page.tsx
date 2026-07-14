import { fetchAssetProducts } from "@/lib/admin/shopify-admin-data";
import AssetCategoryCard from "./AssetCategoryCard";

export default async function AdminAssetsPage() {
  const products = await fetchAssetProducts();

  return (
    <div>
      <h1 className="text-2xl font-serif">Assets & Stock</h1>
      <p className="mt-1 text-sm text-[#6b6a63]">
        Manage every internal component and add-on used by the journal customizer — edit stock, prices, and
        variants.
      </p>

      <div className="mt-6 space-y-6">
        {products.map((product) => (
          <AssetCategoryCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
