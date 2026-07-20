"use client";

export type BackgroundMode = "plain" | "wallpaper";

interface BackgroundSwitcherProps {
  mode: BackgroundMode;
  onChange: (mode: BackgroundMode) => void;
}

/**
 * Dev-only control (sits next to ThemeSwitcher) that toggles the page
 * background between a plain theme color and a blurred wallpaper wash built
 * from the same theme's colors.
 */
export function BackgroundSwitcher({ mode, onChange }: BackgroundSwitcherProps) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-white/15 bg-black/20 p-1 backdrop-blur-sm">
      {(["plain", "wallpaper"] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
            mode === m ? "bg-white text-black" : "text-white/70 hover:text-white"
          }`}
        >
          {m === "plain" ? "Plain color" : "Wallpaper"}
        </button>
      ))}
    </div>
  );
}
