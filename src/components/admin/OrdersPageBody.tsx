"use client";

import { useState } from "react";
import type { AdminOrder } from "@/lib/admin/shopify-admin-data";
import { PriceDisplay } from "@/app/admin/(dashboard)/PriceDisplay";
import { ProductLinePicker } from "@/components/admin/ProductLinePicker";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function isJournalTitle(title: string): boolean {
  return /sanaya journal/i.test(title);
}

function statusTone(status: string): string {
  const s = status.toLowerCase();
  if (["paid", "fulfilled", "delivered"].includes(s)) return "bg-gradient-to-r from-[#dcefe1] to-[#c9e4d1] text-[#0f3d34]";
  if (["pending", "partial", "partially_fulfilled", "unfulfilled"].includes(s))
    return "bg-gradient-to-r from-[#faf1e2] to-[#f3e2c3] text-[#b1632f]";
  if (["refunded", "voided", "cancelled"].includes(s)) return "bg-gradient-to-r from-[#fbe9e7] to-[#f6d4cf] text-[#b5342c]";
  return "bg-gradient-to-r from-[#f2ece1] to-[#ece4d3] text-[#6b6a63]";
}

export function OrdersPageBody({ orders, coverImage }: { orders: AdminOrder[]; coverImage: string | null }) {
  const [selected, setSelected] = useState("journal");

  return (
    <div>
      <div className="mt-6">
        <ProductLinePicker
          selected={selected}
          onSelect={setSelected}
          cards={[
            {
              key: "journal",
              title: "Journal Customizer",
              description: `${orders.length} order${orders.length === 1 ? "" : "s"}`,
              imageUrl: coverImage,
              active: true,
            },
            {
              key: "passport",
              title: "Passport Customizer",
              description: "Not built yet",
              imageUrl: null,
              active: false,
            },
            {
              key: "jewelry",
              title: "Jewelry Customizer",
              description: "Not built yet",
              imageUrl: null,
              active: false,
            },
          ]}
        />
      </div>

      {selected === "journal" && (
        <div className="mt-8 rounded-xl border border-white/70 bg-white/45 backdrop-blur-2xl ring-1 ring-inset ring-white/50 shadow-[0_8px_30px_-12px_rgba(15,61,52,0.15)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-[#f2ece1] to-[#ece4d3] text-left text-xs text-[#6b6a63] uppercase tracking-wide">
                <th className="px-5 py-2.5 font-medium">Order</th>
                <th className="px-5 py-2.5 font-medium">Date</th>
                <th className="px-5 py-2.5 font-medium">Customer</th>
                <th className="px-5 py-2.5 font-medium">Status</th>
                <th className="px-5 py-2.5 font-medium">Total</th>
                <th className="px-5 py-2.5 font-medium">Journal spec</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const journalLines = order.lineItems.filter((li) => /sanaya journal/i.test(li.title));
                return (
                  <tr key={order.id} className="border-t border-[#f0ece0]/80 align-top hover:bg-white/60 transition-colors">
                    <td className="px-5 py-3 font-medium">{order.name}</td>
                    <td className="px-5 py-3 text-[#6b6a63]">{formatDate(order.createdAt)}</td>
                    <td className="px-5 py-3 text-[#6b6a63]">{order.customerName ?? "Guest"}</td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1">
                        <span className={`rounded-full px-2 py-0.5 text-xs ${statusTone(order.displayFinancialStatus)}`}>
                          {order.displayFinancialStatus}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-xs ${statusTone(order.displayFulfillmentStatus)}`}>
                          {order.displayFulfillmentStatus}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 font-medium text-[#1c1c1a]">
                      <PriceDisplay amountIDR={order.totalPriceAmount} />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-col gap-4">
                        {journalLines.map((line, i) => {
                          const charmLines = line.bundleId
                            ? order.lineItems.filter(
                                (li) => li !== line && li.bundleId === line.bundleId && !isJournalTitle(li.title)
                              )
                            : [];
                          return (
                            <div key={i} className="flex gap-3">
                              <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#eae7de] bg-[#f7f5f0]">
                                {line.imageUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={line.imageUrl} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  <span className="text-[10px] text-[#c8c2b3]">—</span>
                                )}
                              </span>
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-[#1c1c1a]">{line.title}</p>
                                <dl className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-[#6b6a63]">
                                  {Object.entries(line.specs).map(([key, value]) => (
                                    <div key={key} className="flex gap-1">
                                      <dt className="text-[#a89a80]">{key}:</dt>
                                      <dd>{value}</dd>
                                    </div>
                                  ))}
                                </dl>
                                {charmLines.length > 0 && (
                                  <p className="mt-0.5 text-[11px] text-[#6b6a63]">
                                    Charms:{" "}
                                    {charmLines
                                      .map((c) => `${c.quantity}× ${c.title}${c.specs.Placement ? ` (${c.specs.Placement})` : ""}`)
                                      .join(", ")}
                                  </p>
                                )}
                                {line.designUrl && (
                                  <a
                                    href={line.designUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-1 inline-block text-xs text-[#0f3d34] underline"
                                  >
                                    View full design →
                                  </a>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-sm text-[#a89a80]">
                    No custom journal orders yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
