"use client";

export interface ProductLineCard {
  key: string;
  title: string;
  description: string;
  imageUrl: string | null;
  active: boolean;
}

export function ProductLinePicker({
  cards,
  selected,
  onSelect,
}: {
  cards: ProductLineCard[];
  selected: string;
  onSelect: (key: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {cards.map((card) => {
        const isSelected = card.key === selected;
        return (
          <button
            key={card.key}
            type="button"
            disabled={!card.active}
            onClick={() => onSelect(card.key)}
            aria-pressed={isSelected}
            className={`group relative isolate flex h-40 flex-col justify-end overflow-hidden rounded-2xl border p-5 text-left transition-all duration-300 ${
              card.active
                ? `border-white/70 shadow-[0_10px_30px_-12px_rgba(15,61,52,0.35)] hover:-translate-y-1 hover:shadow-[0_20px_40px_-14px_rgba(15,61,52,0.45)] ${
                    isSelected ? "-translate-y-1 ring-2 ring-[#0f3d34]/70 shadow-[0_20px_40px_-14px_rgba(15,61,52,0.5)]" : ""
                  }`
                : "border-dashed border-[#d9d4c5] shadow-[0_4px_16px_-10px_rgba(15,61,52,0.1)] cursor-not-allowed"
            }`}
          >
            {/* Background image, blurred + darkened so white text always reads. */}
            {card.imageUrl && (
              <div
                className={`absolute inset-0 -z-10 scale-110 bg-cover bg-center blur-[3px] transition-transform duration-500 group-hover:scale-125 ${
                  isSelected ? "scale-125" : ""
                }`}
                style={{ backgroundImage: `url(${card.imageUrl})` }}
              />
            )}
            <div
              className={`absolute inset-0 -z-10 transition-opacity duration-300 ${
                card.active
                  ? "bg-gradient-to-t from-[#0f3d34]/85 via-[#0f3d34]/40 to-[#0f3d34]/10 group-hover:from-[#0f3d34]/90"
                  : "bg-[#faf8f3]/85 backdrop-blur-sm"
              }`}
            />
            {!card.imageUrl && !card.active && (
              <div className="absolute inset-0 -z-10 bg-[repeating-linear-gradient(135deg,rgba(15,61,52,0.03)_0px,rgba(15,61,52,0.03)_10px,transparent_10px,transparent_20px)]" />
            )}

            <div className="relative flex items-center gap-2">
              <h3 className={`font-serif text-lg ${card.active ? "text-white" : "text-[#8a8778]"}`}>{card.title}</h3>
              {!card.active && (
                <span className="rounded-full border border-dashed border-[#c8c2b3] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#8a8778]">
                  Soon
                </span>
              )}
            </div>
            <p className={`relative mt-1 text-xs ${card.active ? "text-white/80" : "text-[#8a8778]"}`}>
              {card.description}
            </p>

            {card.active && (
              <span
                className={`relative mt-3 inline-flex items-center gap-1 text-xs font-medium text-white/90 transition-transform duration-300 ${
                  isSelected ? "translate-x-1" : "group-hover:translate-x-1"
                }`}
              >
                {isSelected ? "Viewing" : "View assets"}
                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M8.22 5.22a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 010-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
