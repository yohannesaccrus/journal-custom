"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/assets", label: "Assets & Stock" },
  { href: "/admin/orders", label: "Orders" },
];

export function AdminNav({ orderCount }: { orderCount: number }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 px-3 space-y-1">
      {NAV.map((item) => {
        const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
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
        );
      })}
    </nav>
  );
}
