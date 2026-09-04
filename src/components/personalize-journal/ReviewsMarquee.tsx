"use client";

export interface Review {
  initial: string;
  color: string;
  name: string;
  meta: string;
  text: string;
  time: string;
  photo: string;
}

function Stars() {
  return <span className="block text-sm text-[#f5c518] tracking-tight">★★★★★</span>;
}

function ReviewCard({ r }: { r: Review }) {
  return (
    <div className="w-[300px] shrink-0 rounded-md border border-[#e5e2da] bg-white p-5 text-left">
      <div className="flex items-center gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
          style={{ backgroundColor: r.color }}
        >
          {r.initial}
        </span>
        <div>
          <p className="flex items-center gap-1 text-sm font-semibold">
            {r.name}
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-[#4285F4]">
              <path d="M12 2l2.9 1.7 3.3-.4 1.3 3.1 3.1 1.3-.4 3.3L24 12l-1.8 2.9.4 3.3-3.1 1.3-1.3 3.1-3.3-.4L12 24l-2.9-1.8-3.3.4-1.3-3.1-3.1-1.3.4-3.3L0 12l1.8-2.9-.4-3.3 3.1-1.3L5.8 1.4l3.3.4L12 2Z" />
            </svg>
          </p>
          <p className="text-xs text-[#8a887f]">{r.meta}</p>
        </div>
      </div>
      <Stars />
      <p className="mt-2 text-sm leading-relaxed text-[#4a4a45]">{r.text}</p>
      <p className="mt-2 text-xs text-[#8a887f]">{r.time}</p>
      <div className="mt-3 h-16 w-16 overflow-hidden rounded-md bg-[#f2efe6]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={r.photo} alt="" className="h-full w-full object-cover" />
      </div>
    </div>
  );
}

export function ReviewsMarquee({ reviews }: { reviews: Review[] }) {
  const durationSeconds = reviews.length * 6;

  return (
    <div className="relative mt-10 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]">
      <div
        className="flex w-max gap-6"
        style={{ animation: `personalize-journal-marquee ${durationSeconds}s linear infinite` }}
      >
        {[...reviews, ...reviews].map((r, i) => (
          <ReviewCard key={`${r.name}-${i}`} r={r} />
        ))}
      </div>
      <style>{`
        @keyframes personalize-journal-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
