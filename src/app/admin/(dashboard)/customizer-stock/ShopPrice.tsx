"use client";

import { formatMoney } from "@/lib/markets";
import type { CzPrice } from "@/lib/admin/cz-stock";
import { useMarket } from "../MarketContext";

/** The price in the market picked in the top-right switcher, exactly as Shopify charges it there. */
export function ShopPrice({ price }: { price: CzPrice }) {
  const { market } = useMarket();
  const money = market === "BASE" ? price.base : price.markets[market];
  if (!money) return <span className="text-[#6b6a63]">—</span>;
  return <span>{formatMoney(money.amount, money.currency)}</span>;
}
