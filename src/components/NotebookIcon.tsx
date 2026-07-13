"use client";

const SIZES = {
  md: { box: "h-14 w-11", pad: "p-2", gap: "gap-1.5", lines: 4, todoRows: 3, gridCols: 4, gridRows: 5 },
  sm: { box: "h-[34px] w-[27px]", pad: "p-1", gap: "gap-0.5", lines: 4, todoRows: 3, gridCols: 4, gridRows: 5 },
  lg: { box: "h-full w-full", pad: "p-4", gap: "gap-2.5", lines: 9, todoRows: 6, gridCols: 6, gridRows: 9 },
} as const;

interface NotebookIconProps {
  design: string;
  size?: keyof typeof SIZES;
}

export function NotebookIcon({ design, size = "md" }: NotebookIconProps) {
  const s = SIZES[size];
  const lineHeight = size === "lg" ? "h-[1.5px]" : "h-px";
  const cardStyle =
    size === "lg"
      ? "rounded-md border border-[#e5e0d3] shadow-[0_10px_20px_-8px_rgba(28,28,26,0.25),0_2px_6px_-2px_rgba(28,28,26,0.12)]"
      : "rounded-sm shadow-sm";

  if (design === "Lined Notebook") {
    return (
      <div className={`flex ${s.box} flex-col justify-center ${s.gap} bg-white ${s.pad} ${cardStyle}`}>
        {Array.from({ length: s.lines }).map((_, i) => (
          <span key={i} className={`${lineHeight} w-full bg-[#d8d5cb]`} />
        ))}
      </div>
    );
  }
  if (design === "Grid Notebook") {
    return (
      <div
        className={`grid ${s.box} bg-white ${s.pad} ${cardStyle}`}
        style={{
          gridTemplateColumns: `repeat(${s.gridCols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${s.gridRows}, minmax(0, 1fr))`,
          gap: size === "lg" ? "6px" : "2px",
        }}
      >
        {Array.from({ length: s.gridCols * s.gridRows }).map((_, i) => (
          <span key={i} className="rounded-[1px] bg-[#e3b9a8]" />
        ))}
      </div>
    );
  }
  if (design === "To-Do List") {
    return (
      <div className={`flex ${s.box} flex-col justify-center ${s.gap} bg-white ${s.pad} ${cardStyle}`}>
        {Array.from({ length: s.todoRows }).map((_, i) => (
          <span key={i} className="flex items-center gap-2">
            <span
              className={`shrink-0 rounded-[2px] border border-[#c8c2b3] ${
                size === "lg" ? "h-3 w-3" : "h-1.5 w-1.5"
              }`}
            />
            <span className={`${lineHeight} w-full bg-[#d8d5cb]`} />
          </span>
        ))}
      </div>
    );
  }
  // Blank Notebook
  return <div className={`${s.box} bg-white ${cardStyle}`} />;
}
