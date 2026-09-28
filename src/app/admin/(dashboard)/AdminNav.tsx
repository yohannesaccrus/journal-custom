"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LEGACY_ADMIN_ENABLED, CZ_STOCK_PATH } from "@/lib/admin/feature-flags";
import { CZ_PAGES, czPageHref } from "./customizer-stock/pages";

const LEGACY_NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/assets", label: "Assets & Stock" },
  { href: "/admin/orders", label: "Orders" },
];

const NAV: { href: string; label: string; children?: { href: string; label: string }[] }[] = [
  ...(LEGACY_ADMIN_ENABLED ? LEGACY_NAV : []),
  {
    href: CZ_STOCK_PATH,
    label: "Customizer Stock",
    children: CZ_PAGES.map((p) => ({ href: czPageHref(p.slug), label: p.title })),
  },
];

export function AdminNav({ orderCount }: { orderCount: number }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 px-3 space-y-1">
      {NAV.map((item) => {
        // A parent with sub-pages is only "active" on its own page; its sub-pages light up themselves.
        const active = item.href === "/admin" || item.children ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <div key={item.href}>
            <Link
              href={item.href}
              className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-all duration-150 ${
                active
                  ? "bg-gradient-to-r from-white/20 to-white/5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-sm"
                  : "text-[#f2ece1]/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span>{item.label}</span>
              {item.href === "/admin/orders" && (
                <span
                  className={`min-w-[1.375rem] rounded-full px-1.5 py-0.5 text-center text-[11px] font-semibold leading-none tabular-nums transition-colors duration-150 ${
                    active ? "bg-white/25 text-white" : "bg-white/10 text-[#f2ece1]/70"
                  }`}
                >
                  {orderCount}
                </span>
              )}
            </Link>
            {item.children && (
              <div className="ml-4 mt-1 space-y-0.5 border-l border-white/15 pl-2">
                {item.children.map((c) => {
                  const on = pathname.startsWith(c.href);
                  return (
                    <Link
                      key={c.href}
                      href={c.href}
                      className={`block rounded-md px-3 py-1.5 text-[13px] transition-all duration-150 ${
                        on
                          ? "bg-gradient-to-r from-white/20 to-white/5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]"
                          : "text-[#f2ece1]/65 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {c.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
