"use client";

import { useState } from "react";
import type { AdminOrder } from "@/lib/admin/shopify-admin-data";
import type { OrderJournalPreview } from "@/lib/admin/order-preview";
import { PriceDisplay } from "@/app/admin/(dashboard)/PriceDisplay";
import { ProductLinePicker } from "@/components/admin/ProductLinePicker";
import { JournalThumbnail } from "@/components/admin/JournalPreviewModal";

type OrderWithPreviews = AdminOrder & { previews: (OrderJournalPreview | null)[] };

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function statusTone(status: string): string {
  const s = status.toLowerCase();
  if (["paid", "fulfilled", "delivered"].includes(s)) return "bg-gradient-to-r from-[#dcefe1] to-[#c9e4d1] text-[#0f3d34]";
  if (["pending", "partial", "partially_fulfilled", "unfulfilled"].includes(s))
    return "bg-gradient-to-r from-[#faf1e2] to-[#f3e2c3] text-[#b1632f]";
  if (["refunded", "voided", "cancelled"].includes(s)) return "bg-gradient-to-r from-[#fbe9e7] to-[#f6d4cf] text-[#b5342c]";
  return "bg-gradient-to-r from-[#f2ece1] to-[#ece4d3] text-[#6b6a63]";
}

export function OrdersPageBody({
  orders,
  coverImage,
}: {
  orders: OrderWithPreviews[];
  coverImage: string | null;
}) {
  const [selected, setSelected] = useState("journal");

  const activeOrders = orders.filter((o) => o.displayFinancialStatus.toLowerCase() !== "voided");
  const voidedOrders = orders.filter((o) => o.displayFinancialStatus.toLowerCase() === "voided");

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
        <div className="mt-8 flex flex-col gap-8">
          <OrderTable title="Orders" orders={activeOrders} emptyMessage="No custom journal orders yet." />
          {voidedOrders.length > 0 && (
            <OrderTable title="Voided" orders={voidedOrders} emptyMessage="No voided orders." />
          )}
        </div>
      )}
    </div>
  );
}

function OrderTable({
  title,
  orders,
  emptyMessage,
}: {
  title: string;
  orders: OrderWithPreviews[];
  emptyMessage: string;
}) {
  return (
    <div>
      <h3 className="flex items-center gap-2 text-sm font-medium text-[#1c1c1a]">
        {title}
        <span className="rounded-full bg-[#ece4d3] px-2 py-0.5 text-xs font-semibold text-[#6b6a63]">
          {orders.length}
        </span>
      </h3>
      <div className="mt-3 rounded-xl border border-white/70 bg-white/45 backdrop-blur-2xl ring-1 ring-inset ring-white/50 shadow-[0_8px_30px_-12px_rgba(15,61,52,0.15)] overflow-hidden">
        <div className="orders-table-scroll overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-[#f2ece1] to-[#ece4d3] text-left text-xs text-[#6b6a63] uppercase tracking-wide">
                <th className="px-5 py-2.5 font-medium whitespace-nowrap">Order</th>
                <th className="px-5 py-2.5 font-medium whitespace-nowrap">Date</th>
                <th className="px-5 py-2.5 font-medium whitespace-nowrap">Customer</th>
                <th className="px-5 py-2.5 font-medium whitespace-nowrap">Status</th>
                <th className="px-5 py-2.5 font-medium whitespace-nowrap">Total</th>
                <th className="px-5 py-2.5 font-medium whitespace-nowrap">Journal</th>
                <th className="px-5 py-2.5 font-medium whitespace-nowrap">Design</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-t border-[#f0ece0]/80 hover:bg-white/60 transition-colors">
                  <td className="px-5 py-3 font-medium whitespace-nowrap">{order.name}</td>
                  <td className="px-5 py-3 text-[#6b6a63] whitespace-nowrap">{formatDate(order.createdAt)}</td>
                  <td className="px-5 py-3 text-[#6b6a63] whitespace-nowrap">{order.customerName ?? "Guest"}</td>
                  <td className="px-5 py-3">
                    <div className="flex flex-nowrap gap-1">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${statusTone(order.displayFinancialStatus)}`}>
                        {order.displayFinancialStatus}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${statusTone(order.displayFulfillmentStatus)}`}>
                        {order.displayFulfillmentStatus}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3 font-medium text-[#1c1c1a] whitespace-nowrap">
                    <PriceDisplay amountIDR={order.totalPriceAmount} />
                  </td>
                  <td className="px-5 py-3 align-top">
                    <div className="flex flex-col gap-2">
                      {order.journals.map((j, i) => (
                        <JournalThumbnail key={i} imageUrl={j.imageUrl} title={j.title} preview={order.previews[i] ?? null} />
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap">
                    <div className="flex flex-col items-start gap-1.5">
                      {order.designLinks.length > 0 ? (
                        order.designLinks.map((url, i) => (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="group inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-gradient-to-r from-[#154a3f] to-[#0f3d34] py-1.5 pl-3.5 pr-2.5 text-xs font-medium text-white shadow-[0_2px_10px_-4px_rgba(15,61,52,0.5)] transition-all hover:shadow-[0_4px_14px_-4px_rgba(15,61,52,0.6)] hover:-translate-y-0.5"
                          >
                            {order.designLinks.length > 1 ? `View design #${i + 1}` : "View design"}
                            <svg
                              className="h-3 w-3 transition-transform duration-150 group-hover:translate-x-0.5"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M8.22 5.22a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 010-1.06z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </a>
                        ))
                      ) : (
                        <span className="whitespace-nowrap rounded-full border border-dashed border-[#d9d4c5] px-2.5 py-1 text-[11px] text-[#a89a80]">
                          No link
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-sm text-[#a89a80]">
                    {emptyMessage}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
