import Link from "next/link";
import { fetchAssetProducts } from "@/lib/admin/shopify-admin-data";

const LOW_STOCK_THRESHOLD = 10;

export default async function AdminDashboardPage() {
  const products = await fetchAssetProducts();

  const totalVariants = products.reduce((sum, p) => sum + p.variants.length, 0);
  const lowStock = products.flatMap((p) =>
    p.variants
      .filter((v) => v.inventoryQuantity <= LOW_STOCK_THRESHOLD)
      .map((v) => ({ product: p, variant: v }))
  );
  const outOfStock = lowStock.filter((x) => x.variant.inventoryQuantity <= 0);

  return (
    <div>
      <h1 className="text-2xl font-serif">Dashboard</h1>
      <p className="mt-1 text-sm text-[#6b6a63]">Overview of asset categories and current stock levels.</p>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <SummaryCard label="Asset categories" value={products.length} />
        <SummaryCard label="Total variants" value={totalVariants} />
        <SummaryCard
          label="Low / out of stock"
          value={lowStock.length}
          tone={lowStock.length > 0 ? "warn" : "ok"}
        />
      </div>

      {lowStock.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-medium text-[#1c1c1a]">Needs attention</h2>
          <div className="mt-3 rounded-xl border border-[#e8e3d8] bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#f2ece1] text-left text-xs text-[#6b6a63] uppercase tracking-wide">
                  <th className="px-4 py-2.5 font-medium">Product</th>
                  <th className="px-4 py-2.5 font-medium">Variant</th>
                  <th className="px-4 py-2.5 font-medium">Stock</th>
                  <th className="px-4 py-2.5 font-medium" />
                </tr>
              </thead>
              <tbody>
                {lowStock.map(({ product, variant }) => (
                  <tr key={variant.id} className="border-t border-[#f0ece0]">
                    <td className="px-4 py-2.5">{product.title}</td>
                    <td className="px-4 py-2.5 text-[#6b6a63]">{variant.title}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={
                          variant.inventoryQuantity <= 0
                            ? "text-[#b5342c] font-medium"
                            : "text-[#b1632f] font-medium"
                        }
                      >
                        {variant.inventoryQuantity} left
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Link href="/admin/assets" className="text-xs text-[#0f3d34] underline">
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {outOfStock.length > 0 && (
            <p className="mt-2 text-xs text-[#b5342c]">{outOfStock.length} variant(s) are completely out of stock.</p>
          )}
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-sm font-medium text-[#1c1c1a]">Categories</h2>
        <div className="mt-3 grid grid-cols-2 gap-4">
          {products.map((p) => {
            const total = p.variants.reduce((s, v) => s + v.inventoryQuantity, 0);
            return (
              <Link
                key={p.id}
                href="/admin/assets"
                className="rounded-xl border border-[#e8e3d8] bg-white p-4 hover:border-[#0f3d34] transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{p.title}</span>
                  <span className="text-xs rounded-full bg-[#f2ece1] px-2 py-0.5 text-[#6b6a63]">{p.status}</span>
                </div>
                <p className="mt-1 text-xs text-[#6b6a63]">
                  {p.variants.length} variants · {total} units in stock
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone?: "warn" | "ok" }) {
  return (
    <div className="rounded-xl border border-[#e8e3d8] bg-white p-5">
      <p className="text-xs text-[#6b6a63]">{label}</p>
      <p
        className={
          "mt-1 text-3xl font-serif " + (tone === "warn" ? "text-[#b1632f]" : "text-[#1c1c1a]")
        }
      >
        {value}
      </p>
    </div>
  );
}
