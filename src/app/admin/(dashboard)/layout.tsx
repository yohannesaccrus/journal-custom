import { fetchJournalOrders } from "@/lib/admin/shopify-admin-data";
import { AdminNav } from "./AdminNav";
import { AdminMobileNav } from "./AdminMobileNav";
import { CurrencyProvider } from "./CurrencyContext";
import { CurrencySwitcher } from "./CurrencySwitcher";

export const metadata = {
  title: "Admin — Sanaya",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Best-effort — the sidebar badge shouldn't break the whole admin shell if
  // the Shopify Admin API call fails.
  const orderCount = await fetchJournalOrders()
    .then(({ orders }) => orders.length)
    .catch(() => 0);

  return (
    <CurrencyProvider>
      <CurrencySwitcher />
      <AdminMobileNav orderCount={orderCount} />
      <div className="min-h-screen bg-gradient-to-br from-[#faf8f3] via-[#f7f5f0] to-[#efe9dc] text-[#1c1c1a]">
        <div className="flex min-h-screen">
          {/* `sticky` + `h-screen` keep this pinned to the viewport regardless
              of how tall the page content is — previously it stretched to
              match the main content's height, which pushed "Log out" far
              below the fold on any scrollable page. Hidden below `md:` — see
              AdminMobileNav for the equivalent drawer on small screens. */}
          <aside className="sticky top-0 z-40 hidden h-screen w-60 shrink-0 self-start overflow-hidden bg-gradient-to-b from-[#154a3f] via-[#0f3d34] to-[#0a2b25] text-white md:relative md:flex md:flex-col">
            {/* soft glow accents — purely decorative */}
            <div className="pointer-events-none absolute -top-16 -left-16 h-56 w-56 rounded-full bg-[#b1632f]/30 blur-[80px]" />
            <div className="pointer-events-none absolute bottom-0 -right-12 h-52 w-52 rounded-full bg-white/15 blur-[80px]" />
            <div className="pointer-events-none absolute top-1/2 left-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#2f7a63]/30 blur-[90px]" />

            <div className="relative px-6 py-6">
              <span className="text-lg tracking-[0.2em] font-serif text-[#f2ece1]">SANAYA</span>
              <p className="mt-0.5 text-xs text-[#a89a80]">Admin panel</p>
            </div>
            <div className="relative flex-1 flex flex-col min-h-0">
              <AdminNav orderCount={orderCount} />
              <form action="/api/admin/logout" method="POST" className="shrink-0 px-3 pb-6">
                <button
                  type="submit"
                  className="w-full rounded-lg px-3 py-2 text-left text-sm text-[#f2ece1]/70 backdrop-blur-sm transition-colors hover:bg-white/10 hover:text-white"
                >
                  Log out
                </button>
              </form>
            </div>
          </aside>
          <main className="relative flex-1 min-w-0 px-4 pt-20 pb-8 sm:px-6 md:px-8 md:pt-8">
            {/* ambient blurred color behind the glass cards, fixed to the
                viewport so it reads clearly through the blur no matter how
                far the page scrolls */}
            <div className="pointer-events-none fixed -z-10 top-[-10%] left-[20%] h-[420px] w-[420px] rounded-full bg-[#0f3d34]/20 blur-[110px]" />
            <div className="pointer-events-none fixed -z-10 top-[20%] right-[5%] h-[380px] w-[380px] rounded-full bg-[#b1632f]/20 blur-[110px]" />
            <div className="pointer-events-none fixed -z-10 bottom-[-15%] left-[35%] h-[440px] w-[440px] rounded-full bg-[#2f7a63]/15 blur-[120px]" />
            {children}
          </main>
        </div>
      </div>
    </CurrencyProvider>
  );
}
