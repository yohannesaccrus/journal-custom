import { fetchAssetProducts, fetchJournalOrders } from "@/lib/admin/shopify-admin-data";
import { buildOrderJournalPreview } from "@/lib/admin/order-preview";
import { fetchCharmProduct, fetchJournalProducts } from "@/lib/shopify-admin";
import { OrdersPageBody } from "@/components/admin/OrdersPageBody";

export default async function AdminOrdersPage() {
  const [{ orders }, products, journalProducts, charmProduct] = await Promise.all([
    fetchJournalOrders(),
    fetchAssetProducts(),
    fetchJournalProducts(),
    fetchCharmProduct(),
  ]);

  const coverImage =
    products.find((p) => /cover/i.test(p.title))?.variants.find((v) => v.image)?.image?.url ??
    products.flatMap((p) => p.variants).find((v) => v.image)?.image?.url ??
    null;

  // Journal specs only store the cover's product *handle* — resolve it to a
  // human title once here rather than per-row in the client.
  const coverTitleByHandle = Object.fromEntries(products.map((p) => [p.handle, p.title]));

  // Rebuild the same front/back/side view each order's design link points to,
  // so the Orders table can preview it inline instead of only linking out.
  const ordersWithPreviews = orders.map((order) => ({
    ...order,
    previews: order.specs.map((spec) =>
      spec ? buildOrderJournalPreview(spec, journalProducts, charmProduct) : null
    ),
  }));

  return (
    <div>
      <h1 className="text-2xl font-serif">Orders</h1>
      <p className="mt-1 text-sm text-[#6b6a63]">
        Custom journal orders, with a direct link to each customer&apos;s final design preview.
      </p>

      <OrdersPageBody orders={ordersWithPreviews} coverImage={coverImage} coverTitleByHandle={coverTitleByHandle} />
    </div>
  );
}
