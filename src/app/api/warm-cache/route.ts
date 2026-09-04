import { fetchCharmProduct, fetchJournalProducts, fetchNotebookProduct, fetchPatchProduct, fetchPouchProduct, fetchSwatchColors } from "@/lib/shopify-admin";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Pre-warms the in-memory product cache (see `fetchProducts` in
 * shopify-admin.ts) before it goes stale, so real visitors ideally never
 * land on the serverless instance that has to eat the full cold-cache
 * fetch. Triggered on a schedule by `vercel.json`'s cron entry, well under
 * the 45-minute cache TTL.
 *
 * This helps probabilistically, not absolutely -- the cache lives in each
 * serverless instance's own memory, and Vercel can route the cron hit and a
 * real visitor to different instances. Combined with the batched fetch and
 * stale-while-revalidate in `fetchProducts`, it substantially narrows the
 * odds of anyone hitting a cold cache without needing a shared cache store.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  await Promise.all([
    fetchJournalProducts(),
    fetchCharmProduct(),
    fetchNotebookProduct(),
    fetchPatchProduct(),
    fetchPouchProduct(),
    fetchSwatchColors(),
  ]);

  return Response.json({ warmed: true, at: new Date().toISOString() });
}
