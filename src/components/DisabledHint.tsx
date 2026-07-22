"use client";

interface DisabledHintProps {
  message: string | null;
  children: React.ReactNode;
  className?: string;
}

/**
 * Wraps a (possibly disabled) control and shows a fading tooltip above it on
 * hover when `message` is set — e.g. explaining why "Continue" is disabled.
 * `group-hover` still fires here even though the button itself is
 * `disabled`, since :hover is computed from cursor position on this
 * wrapper, not from the button's own interactivity.
 */
export function DisabledHint({ message, children, className }: DisabledHintProps) {
  return (
    <div className={`group relative inline-flex ${className ?? ""}`}>
      {children}
      {message && (
        <div
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-max max-w-[220px] -translate-x-1/2 translate-y-1 rounded-md bg-[var(--ink)] px-3 py-1.5 text-center text-xs text-white opacity-0 shadow-lg transition-[opacity,transform] duration-200 ease-out group-hover:translate-y-0 group-hover:opacity-100"
        >
          {message}
          <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-[var(--ink)]" />
        </div>
      )}
    </div>
  );
}
