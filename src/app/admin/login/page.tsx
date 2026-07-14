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
    <div className="min-h-screen bg-[#0f3d34] flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-8">
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
              className="mt-1 w-full rounded-lg border border-[#d8d5cb] px-3 py-2.5 text-sm text-[#1c1c1a] outline-none focus:border-[#0f3d34] focus:ring-1 focus:ring-[#0f3d34]"
            />
          </div>

          {error && <p className="text-sm text-[#b5342c]">Incorrect password. Try again.</p>}

          <button
            type="submit"
            className="w-full rounded-full bg-[#0f3d34] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#0c332b]"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
