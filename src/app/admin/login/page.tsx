export const metadata = {
  title: "Admin Login — Sanaya",
  robots: { index: false, follow: false },
};

interface LoginPageProps {
  searchParams: Promise<{ error?: string; next?: string }>;
}

export default async function AdminLoginPage({ searchParams }: LoginPageProps) {
  const { error, next } = await searchParams;

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#154a3f] via-[#0f3d34] to-[#0a2b25] flex items-center justify-center p-4">
      {/* decorative glow accents */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-[#b1632f]/35 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-96 w-96 rounded-full bg-white/15 blur-[100px]" />
      <div className="pointer-events-none absolute top-1/3 right-1/4 h-64 w-64 rounded-full bg-[#2f7a63]/30 blur-[100px]" />

      <div className="relative w-full max-w-sm rounded-2xl border border-white/70 bg-white/50 backdrop-blur-2xl ring-1 ring-inset ring-white/50 shadow-2xl p-8">
        <span className="text-xl tracking-[0.2em] font-serif text-[#b1632f]">SANAYA</span>
        <h1 className="mt-4 text-2xl font-serif text-[#1c1c1a]">Admin sign in</h1>
        <p className="mt-1 text-sm text-[#6b6a63]">Asset & order management — internal use only.</p>

        <form action="/api/admin/login" method="POST" className="mt-6 space-y-4">
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
