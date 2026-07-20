"use client";

export type Theme = "heritage" | "studio" | "atelier";

export const THEMES: { id: Theme; label: string; swatch: string }[] = [
  { id: "heritage", label: "Style 1", swatch: "#0f3d34" },
  { id: "studio", label: "Style 2", swatch: "#111111" },
  { id: "atelier", label: "Style 3", swatch: "#b5566f" },
];

interface ThemeSwitcherProps {
  theme: Theme;
  onChange: (theme: Theme) => void;
}

/**
 * Dev-only style picker so a client can toggle between the three customizer
 * looks and decide which one to ship — never rendered in production (see the
 * NODE_ENV guard where this is used in JournalCustomizer).
 */
export function ThemeSwitcher({ theme, onChange }: ThemeSwitcherProps) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-white/15 bg-black/20 p-1 backdrop-blur-sm">
      <span className="pl-2 pr-1 text-[10px] font-medium uppercase tracking-wide text-white/50">
        Preview style
      </span>
      {THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            theme === t.id ? "bg-white text-black" : "text-white/70 hover:text-white"
          }`}
        >
          <span
            className="h-2.5 w-2.5 rounded-full border border-white/30"
            style={{ backgroundColor: t.swatch }}
          />
          {t.label}
        </button>
      ))}
    </div>
  );
}
