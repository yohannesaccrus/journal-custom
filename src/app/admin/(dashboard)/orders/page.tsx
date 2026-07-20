import { fetchJournalOrders } from "@/lib/admin/shopify-admin-data";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function statusTone(status: string): string {
  const s = status.toLowerCase();
  if (["paid", "fulfilled", "delivered"].includes(s)) return "bg-[#e4efe6] text-[#0f3d34]";
  if (["pending", "partial", "partially_fulfilled", "unfulfilled"].includes(s)) return "bg-[#faf1e2] text-[#b1632f]";
  if (["refunded", "voided", "cancelled"].includes(s)) return "bg-[#fbe9e7] text-[#b5342c]";
  return "bg-[#f2ece1] text-[#6b6a63]";
}

export default async function AdminOrdersPage() {
  const { orders } = await fetchJournalOrders();

  return (
    <div>
      <h1 className="text-2xl font-serif">Orders</h1>
      <p className="mt-1 text-sm text-[#6b6a63]">
        Custom journal orders, with a direct link to each customer&apos;s final design preview.
      </p>

      <div className="mt-6 rounded-xl border border-[#e8e3d8] bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#f2ece1] text-left text-xs text-[#6b6a63] uppercase tracking-wide">
              <th className="px-5 py-2.5 font-medium">Order</th>
              <th className="px-5 py-2.5 font-medium">Date</th>
              <th className="px-5 py-2.5 font-medium">Customer</th>
              <th className="px-5 py-2.5 font-medium">Status</th>
              <th className="px-5 py-2.5 font-medium">Total</th>
              <th className="px-5 py-2.5 font-medium">Design</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const journalLines = order.lineItems.filter((li) => /sanaya journal/i.test(li.title));
              return (
                <tr key={order.id} className="border-t border-[#f0ece0] align-top">
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
                  <td className="px-5 py-3 text-[#6b6a63]">{order.totalPrice}</td>
                  <td className="px-5 py-3">
                    <div className="flex flex-col gap-1">
                      {journalLines.map((li, i) =>
                        li.designUrl ? (
                          <a
                            key={i}
                            href={li.designUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-[#0f3d34] underline"
                          >
                            {li.title} →
                          </a>
                        ) : (
                          <span key={i} className="text-xs text-[#a89a80]">
                            {li.title} (no link)
                          </span>
                        )
                      )}
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
    </div>
  );
}
