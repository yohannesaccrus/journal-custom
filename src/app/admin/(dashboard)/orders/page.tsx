import { fetchAssetProducts, fetchJournalOrders } from "@/lib/admin/shopify-admin-data";
import { OrdersPageBody } from "@/components/admin/OrdersPageBody";

export default async function AdminOrdersPage() {
  const [{ orders }, products] = await Promise.all([fetchJournalOrders(), fetchAssetProducts()]);

  const coverImage =
    products.find((p) => /cover/i.test(p.title))?.variants.find((v) => v.image)?.image?.url ??
    products.flatMap((p) => p.variants).find((v) => v.image)?.image?.url ??
    null;

  return (
    <div>
      <h1 className="text-2xl font-serif">Orders</h1>
      <p className="mt-1 text-sm text-[#6b6a63]">
        Custom journal orders, with a direct link to each customer&apos;s final design preview.
      </p>

      <OrdersPageBody orders={orders} coverImage={coverImage} />
    </div>
  );
}
