import Link from "next/link";

export const metadata = {
  title: "Admin — Sanaya",
  robots: { index: false, follow: false },
};

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/assets", label: "Assets & Stock" },
  { href: "/admin/orders", label: "Orders" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f7f5f0] text-[#1c1c1a]">
      <div className="flex min-h-screen">
        <aside className="w-60 shrink-0 bg-[#0f3d34] text-white flex flex-col">
          <div className="px-6 py-6">
            <span className="text-lg tracking-[0.2em] font-serif text-[#f2ece1]">SANAYA</span>
            <p className="mt-0.5 text-xs text-[#a89a80]">Admin panel</p>
          </div>
          <nav className="flex-1 px-3 space-y-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-lg px-3 py-2 text-sm text-[#f2ece1]/90 hover:bg-white/10 transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <form action="/api/admin/logout" method="POST" className="px-3 pb-6">
            <button
              type="submit"
              className="w-full rounded-lg px-3 py-2 text-left text-sm text-[#f2ece1]/70 hover:bg-white/10 hover:text-white transition-colors"
            >
              Log out
            </button>
          </form>
        </aside>
        <main className="flex-1 min-w-0 px-8 py-8">{children}</main>
      </div>
    </div>
  );
}
