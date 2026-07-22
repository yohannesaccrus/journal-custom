import { fetchAssetProducts, fetchJournalOrderCount } from "@/lib/admin/shopify-admin-data";
import { NeedsAttentionTable, type NeedsAttentionRow } from "@/components/admin/NeedsAttentionTable";

const LOW_STOCK_THRESHOLD = 10;

export default async function AdminDashboardPage() {
  const [products, orderCount] = await Promise.all([fetchAssetProducts(), fetchJournalOrderCount()]);

  const lowStock: NeedsAttentionRow[] = products.flatMap((p) =>
    p.variants
      .filter((v) => v.inventoryQuantity <= LOW_STOCK_THRESHOLD)
      .map((v) => ({
        variantId: v.id,
        productTitle: p.title,
        variantTitle: v.title,
        imageUrl: v.image?.url ?? null,
        inventoryQuantity: v.inventoryQuantity,
      }))
  );
  const outOfStockCount = lowStock.filter((x) => x.inventoryQuantity <= 0).length;

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif">Dashboard</h1>
          <p className="mt-1 text-sm text-[#6b6a63]">Overview across every Sanaya product line.</p>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Journal Customizer — the current, live product line.               */}
      {/* ------------------------------------------------------------------ */}
      <ProductLineSection title="Journal Customizer" status="live">
        <div className="grid grid-cols-2 gap-4">
          <div className="relative overflow-hidden rounded-xl border border-white/70 bg-white/30 backdrop-blur-3xl ring-1 ring-inset ring-white/50 p-5 shadow-[0_4px_20px_-10px_rgba(15,61,52,0.15)]">
            <div className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-[#0f3d34]/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-10 -left-10 h-24 w-24 rounded-full bg-[#b1632f]/10 blur-3xl" />
            <p className="relative text-xs text-[#6b6a63]">Orders</p>
            <p className="relative mt-1 text-3xl font-serif bg-clip-text text-transparent bg-gradient-to-br from-[#154a3f] to-[#0a2b25]">
              {orderCount.count}
              {orderCount.capped ? "+" : ""}
            </p>
          </div>
          <SummaryCard
            label="Low / out of stock"
            value={lowStock.length}
            tone={lowStock.length > 0 ? "warn" : "ok"}
          />
        </div>

        {lowStock.length > 0 && (
          <div className="mt-8">
            <h3 className="text-sm font-medium text-[#1c1c1a]">Needs attention</h3>
            <div className="mt-3">
              <NeedsAttentionTable rows={lowStock} />
            </div>
            {outOfStockCount > 0 && (
              <p className="mt-2 text-xs text-[#b5342c]">{outOfStockCount} variant(s) are completely out of stock.</p>
            )}
          </div>
        )}
      </ProductLineSection>

      {/* ------------------------------------------------------------------ */}
      {/* Future product lines — wireframe placeholders only, no data wired  */}
      {/* up yet. Same section shell as Journal Customizer so the dashboard  */}
      {/* reads as one consistent multi-line overview as these come online.  */}
      {/* ------------------------------------------------------------------ */}
      <ProductLineSection title="Passport Customization" status="draft">
        <PlaceholderGrid />
      </ProductLineSection>

      <ProductLineSection title="Jewelry Customization" status="draft">
        <PlaceholderGrid />
      </ProductLineSection>
    </div>
  );
}

function ProductLineSection({
  title,
  status,
  children,
}: {
  title: string;
  status: "live" | "draft";
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10 first:mt-8">
      <div className="flex items-center gap-2.5 border-b border-[#e7e2d4] pb-3">
        <h2 className="text-lg font-serif text-[#1c1c1a]">{title}</h2>
        {status === "live" ? (
          <span className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#e4efe9] to-[#d9e9e1] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#0f3d34]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#2f8f5b]" />
            Live
          </span>
        ) : (
          <span className="rounded-full border border-dashed border-[#c8c2b3] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#8a8778]">
            Draft
          </span>
        )}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function PlaceholderGrid() {
  return (
    <div className="grid grid-cols-2 gap-4">
      {["Orders", "Low / out of stock"].map((label) => (
        <div
          key={label}
          className="relative overflow-hidden rounded-xl border border-dashed border-[#d9d4c5] bg-[repeating-linear-gradient(135deg,rgba(15,61,52,0.03)_0px,rgba(15,61,52,0.03)_10px,transparent_10px,transparent_20px)] p-5"
        >
          <p className="text-xs text-[#8a8778]">{label}</p>
          <p className="mt-1 text-3xl font-serif text-[#c8c2b3]">—</p>
        </div>
      ))}
      <div className="col-span-2 flex items-center justify-center rounded-xl border border-dashed border-[#d9d4c5] bg-[#faf8f3]/60 p-6 text-center">
        <p className="text-sm text-[#8a8778]">Not built yet — this section will populate once this product line goes live.</p>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: number | string; tone?: "warn" | "ok" }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-white/70 bg-white/45 backdrop-blur-2xl ring-1 ring-inset ring-white/50 p-5 shadow-[0_4px_20px_-10px_rgba(15,61,52,0.15)]">
      <div
        className={`pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full blur-2xl ${
          tone === "warn" ? "bg-[#b1632f]/15" : "bg-[#0f3d34]/10"
        }`}
      />
      <p className="relative text-xs text-[#6b6a63]">{label}</p>
      <p
        className={
          "relative mt-1 text-3xl font-serif bg-clip-text text-transparent bg-gradient-to-br " +
          (tone === "warn" ? "from-[#c17a3f] to-[#9c4a1f]" : "from-[#154a3f] to-[#0a2b25]")
        }
      >
        {value}
      </p>
    </div>
  );
}
