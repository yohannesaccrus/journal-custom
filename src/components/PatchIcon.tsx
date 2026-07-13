"use client";

const STAR_PATH = "M12,2 L14.9,8.6 L22,9.3 L16.6,14 L18.2,21 L12,17.3 L5.8,21 L7.4,14 L2,9.3 L9.1,8.6 Z";
const HEART_PATH =
  "M12,21 C7,16.8 2.5,12.9 2.5,8.4 C2.5,4.9 5.2,2.5 8.3,2.5 C10.2,2.5 11.6,3.5 12,5.2 C12.4,3.5 13.8,2.5 15.7,2.5 C18.8,2.5 21.5,4.9 21.5,8.4 C21.5,12.9 17,16.8 12,21 Z";

interface PatchIconProps {
  shape: "star" | "heart";
  className?: string;
}

export function PatchIcon({ shape, className }: PatchIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <defs>
        <linearGradient id={`patch-grad-${shape}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e8c88f" />
          <stop offset="100%" stopColor="#b3854a" />
        </linearGradient>
      </defs>
      <path d={shape === "star" ? STAR_PATH : HEART_PATH} fill={`url(#patch-grad-${shape})`} stroke="rgba(0,0,0,0.35)" strokeWidth="0.5" />
    </svg>
  );
}
