"use client";

interface SwatchProps {
  label: string;
  selected: boolean;
  onClick: () => void;
  color?: string;
  thumbnail?: string;
  priceLabel?: string;
  disabled?: boolean;
}

export function Swatch({ label, selected, onClick, color, thumbnail, priceLabel, disabled }: SwatchProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center gap-1.5 group disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <span
        className={`relative h-11 w-11 rounded-[var(--radius-chip)] border-2 transition-all overflow-hidden ${
          selected
            ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/30"
            : "border-transparent group-hover:border-[var(--accent)]/30"
        }`}
        style={color ? { backgroundColor: color } : undefined}
      >
        {thumbnail && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbnail} alt="" className="h-full w-full object-cover" />
        )}
      </span>
      <span className="text-xs text-[var(--ink)] text-center leading-tight max-w-[4.5rem]">{label}</span>
      {priceLabel && <span className="text-[10px] text-[var(--brand)] -mt-1">{priceLabel}</span>}
    </button>
  );
}
