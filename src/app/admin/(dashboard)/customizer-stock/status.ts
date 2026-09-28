import type { Tone } from "./ui";

/** At or below this many left, an asset shows as Low. */
export const LOW_ASSET_STOCK = 5;

/** What's left of an asset (null when never counted) and how to show it. */
export function assetStatus(counted: number | null, used: number): { remaining: number | null; tone: Tone; text: string } {
  if (counted == null) return { remaining: null, tone: "muted", text: "Not counted" };
  const remaining = counted - used;
  if (remaining <= 0) return { remaining, tone: "out", text: "Sold out" };
  if (remaining <= LOW_ASSET_STOCK) return { remaining, tone: "low", text: "Low" };
  return { remaining, tone: "ok", text: "In stock" };
}
