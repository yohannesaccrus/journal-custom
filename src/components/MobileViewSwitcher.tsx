"use client";

interface MobileViewSwitcherProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

/**
 * Dev-only toggle that swaps the desktop preview for a phone-sized <iframe>
 * of the same style, so a reviewer can check the mobile layout without
 * leaving their desktop browser. Only meaningful on desktop, so the parent
 * hides this control itself on small viewports (`hidden md:flex`).
 */
export function MobileViewSwitcher({ enabled, onChange }: MobileViewSwitcherProps) {
  return (
    <div className="hidden md:flex items-center gap-1 rounded-full border border-white/15 bg-black/20 p-1 backdrop-blur-sm">
      <span className="pl-2 pr-1 text-[10px] font-medium uppercase tracking-wide text-white/50">Mobile view</span>
      {([false, true] as const).map((v) => (
        <button
          key={String(v)}
          type="button"
          onClick={() => onChange(v)}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            enabled === v ? "bg-white text-black" : "text-white/70 hover:text-white"
          }`}
        >
          {v ? "On" : "Off"}
        </button>
      ))}
    </div>
  );
}
