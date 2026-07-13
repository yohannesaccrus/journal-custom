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
      className="flex flex-col items-center gap-2 group disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <span
        className={`relative h-16 w-16 rounded-xl border-2 transition-all overflow-hidden ${
          selected
            ? "border-[#0f3d34] ring-2 ring-[#0f3d34]/30"
            : "border-transparent group-hover:border-[#0f3d34]/30"
        }`}
        style={color ? { backgroundColor: color } : undefined}
      >
        {thumbnail && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbnail} alt="" className="h-full w-full object-cover" />
        )}
      </span>
      <span className="text-sm text-[#2a2a28] text-center leading-tight max-w-[5rem]">{label}</span>
      {priceLabel && <span className="text-xs text-[#b1632f] -mt-1">{priceLabel}</span>}
    </button>
  );
}
