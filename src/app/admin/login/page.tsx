import { isShopifySignInConfigured } from "@/lib/shopify-oauth";

export const metadata = {
  title: "Admin Login — Sanaya",
  robots: { index: false, follow: false },
};

interface LoginPageProps {
  searchParams: Promise<{ error?: string; next?: string }>;
}

export default async function AdminLoginPage({ searchParams }: LoginPageProps) {
  const { error, next } = await searchParams;
  const shopifySignInAvailable = isShopifySignInConfigured();

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#154a3f] via-[#0f3d34] to-[#0a2b25] flex items-center justify-center p-4">
      {/* decorative glow accents */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-[#b1632f]/35 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-96 w-96 rounded-full bg-white/15 blur-[100px]" />
      <div className="pointer-events-none absolute top-1/3 right-1/4 h-64 w-64 rounded-full bg-[#2f7a63]/30 blur-[100px]" />

      <div className="relative w-full max-w-sm rounded-2xl border border-white/60 bg-[#faf8f3]/95 backdrop-blur-2xl ring-1 ring-inset ring-white/70 shadow-2xl p-6 sm:p-8">
        <span className="text-xl tracking-[0.2em] font-serif text-[#b1632f]">SANAYA</span>
        <h1 className="mt-4 text-2xl font-serif text-[#1c1c1a]">Admin sign in</h1>
        <p className="mt-1 text-sm text-[#6b6a63]">Asset & order management — internal use only.</p>

        {error === "shopify" && (
          <p className="mt-4 text-sm text-[#b5342c]">
            Couldn&apos;t sign in with Shopify — make sure you&apos;re logged into the right store&apos;s admin, then try
            again.
          </p>
        )}

        {shopifySignInAvailable && (
          <>
            <a
              href={`/api/admin/auth/shopify/start?next=${encodeURIComponent(next ?? "/admin")}`}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full border border-[#0f3d34] bg-white px-6 py-2.5 text-sm font-medium text-[#0f3d34] shadow-sm transition-colors hover:bg-[#0f3d34]/5"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                <path d="M15.34 2.4c-.2-.16-.45-.2-.68-.13-.02 0-.4.12-1.03.32-.1-.32-.26-.7-.48-1.1-.7-1.3-1.73-2-2.95-2h-.02c-.08 0-.16 0-.24.02-.03-.04-.07-.08-.1-.11C9.28.4 8.63.2 7.9.2 6.5.24 5.1 1.24 3.98 3c-.8 1.24-1.4 2.8-1.58 4-1.44.45-2.45.76-2.47.77-.72.23-.75.25-.84.94C-1 9.28-.03 20.4-.03 20.4l14.4 2.7 6.24-1.55S15.6 2.6 15.34 2.4Z" />
              </svg>
              Sign in with Shopify
            </a>
            <div className="my-4 flex items-center gap-3 text-xs text-[#a09d92]">
              <div className="h-px flex-1 bg-[#e2ded2]" />
              or
              <div className="h-px flex-1 bg-[#e2ded2]" />
            </div>
          </>
        )}

        <form action="/api/admin/login" method="POST" className={shopifySignInAvailable ? "space-y-4" : "mt-6 space-y-4"}>
          <input type="hidden" name="next" value={next ?? "/admin"} />
          <div>
            <label htmlFor="password" className="text-xs font-medium text-[#6b6a63]">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoFocus
              className="mt-1 w-full rounded-lg border border-[#d8d5cb] bg-white/90 px-3 py-2.5 text-sm text-[#1c1c1a] outline-none focus:border-[#0f3d34] focus:ring-1 focus:ring-[#0f3d34]"
            />
          </div>

          {error && <p className="text-sm text-[#b5342c]">Incorrect password. Try again.</p>}

          <button
            type="submit"
            className="w-full rounded-full bg-gradient-to-r from-[#154a3f] to-[#0f3d34] px-6 py-2.5 text-sm font-medium text-white shadow-md transition-all hover:from-[#0f3d34] hover:to-[#0a2b25]"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
