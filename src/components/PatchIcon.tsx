"use client";

import type { JournalSelection } from "@/lib/types";

const STAR_PATH = "M12,2 L14.9,8.6 L22,9.3 L16.6,14 L18.2,21 L12,17.3 L5.8,21 L7.4,14 L2,9.3 L9.1,8.6 Z";
const HEART_PATH =
  "M12,21 C7,16.8 2.5,12.9 2.5,8.4 C2.5,4.9 5.2,2.5 8.3,2.5 C10.2,2.5 11.6,3.5 12,5.2 C12.4,3.5 13.8,2.5 15.7,2.5 C18.8,2.5 21.5,4.9 21.5,8.4 C21.5,12.9 17,16.8 12,21 Z";

/** Gradient stops per material — a rough stand-in for the real stitched patch photo, only ever shown as a fallback (see the "Fallback only" comments at each call site) before/if a specific combo's real photo is missing. */
const MATERIAL_GRADIENT: Record<string, [string, string]> = {
  brown: ["#e8c88f", "#b3854a"],
  red: ["#e58a7c", "#b5342c"],
  sparkle: ["#fdf6dc", "#cf9a2e"],
};

export type PatchValue = Exclude<JournalSelection["patch"], "none">;

interface PatchIconProps {
  shape: PatchValue;
  className?: string;
}

export function PatchIcon({ shape, className }: PatchIconProps) {
  const [material, form] = shape.split("-") as [string, "heart" | "star"];
  const [from, to] = MATERIAL_GRADIENT[material] ?? MATERIAL_GRADIENT.brown;
  const gradId = `patch-grad-${shape}`;
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
      </defs>
      <path d={form === "star" ? STAR_PATH : HEART_PATH} fill={`url(#${gradId})`} stroke="rgba(0,0,0,0.35)" strokeWidth="0.5" />
    </svg>
  );
}
