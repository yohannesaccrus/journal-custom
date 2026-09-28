import { CARD } from "./styles";

/** Skeleton of the Customizer Stock page while Shopify is being read (several Admin API calls). */
export default function Loading() {
  const bar = "animate-pulse rounded-md bg-[#0f3d34]/[0.08]";
  return (
    <div className="mx-auto max-w-7xl" aria-busy="true" aria-label="Loading customizer stock">
      <div className="mb-8">
        <div className={`${bar} h-8 w-64`} />
      </div>

      <div className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="h-[118px] animate-pulse rounded-2xl bg-gradient-to-br from-[#154a3f] via-[#0f3d34] to-[#0a2b25] opacity-80" />
        {[0, 1, 2].map((i) => (
          <div key={i} className={`${CARD} h-[118px] p-5`}>
            <div className={`${bar} h-3 w-20`} />
            <div className={`${bar} mt-4 h-8 w-12`} />
          </div>
        ))}
      </div>

      <div className={`${bar} mb-4 h-6 w-32`} />
      <div className="space-y-4">
        {[5, 3].map((rows, i) => (
          <div key={i} className={`${CARD} overflow-hidden`}>
            <div className="flex items-center gap-3 px-5 py-4">
              <div className={`${bar} h-5 w-28`} />
              <div className={`${bar} ml-auto h-5 w-24 rounded-full`} />
            </div>
            {Array.from({ length: rows }, (_, r) => (
              <div key={r} className="flex items-center gap-4 border-t border-[#e6e0d2]/80 px-5 py-3">
                <div className={`${bar} h-10 w-10 rounded-lg`} />
                <div className={`${bar} h-4 w-28`} />
                <div className={`${bar} ml-8 h-4 w-24`} />
                <div className={`${bar} ml-auto h-8 w-64 rounded-lg`} />
              </div>
            ))}
          </div>
        ))}
      </div>
      <p className="mt-6 flex items-center justify-center gap-2 text-xs text-[#6b6a63]">
        <svg className="h-3.5 w-3.5 animate-spin text-[#b1632f]" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
          <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
        Reading stock and prices from Shopify…
      </p>
    </div>
  );
}
