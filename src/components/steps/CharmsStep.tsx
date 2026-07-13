"use client";

import { useRef } from "react";
import { buildCharmEntries, resolveSideImage, type CharmEntry } from "@/lib/catalog";
import { formatIDR } from "@/lib/pricing";
import type { ShopifyJournalProduct } from "@/lib/shopify-admin";
import type { CharmSide, JournalSelection, PlacedCharm } from "@/lib/types";

interface CharmsStepProps {
  product: ShopifyJournalProduct;
  charmProduct: ShopifyJournalProduct;
  selection: JournalSelection;
  journalImageUrl: string;
  onChange: (charms: PlacedCharm[]) => void;
}

const VIEWS: { key: CharmSide; label: string; wide: boolean }[] = [
  { key: "front", label: "Front", wide: true },
  { key: "back", label: "Back", wide: true },
  { key: "side", label: "Side", wide: false },
];

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/** Generates a placement outside the component so the impure Date/Math calls aren't part of render scope. */
function newPlacement(variantId: string, design: string, side: CharmSide, x: number, y: number): PlacedCharm {
  return {
    instanceId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    variantId,
    design,
    side,
    x,
    y,
  };
}

const DRAG_MIME = "application/x-sanaya-charm";

interface CharmCanvasProps {
  label: string;
  wide: boolean;
  imageUrl: string | undefined;
  charms: PlacedCharm[];
  entries: CharmEntry[];
  onDropCharm: (variantId: string, design: string, x: number, y: number) => void;
  onMove: (instanceId: string, x: number, y: number) => void;
  onRemove: (instanceId: string) => void;
}

function CharmCanvas({ label, wide, imageUrl, charms, entries, onDropCharm, onMove, onRemove }: CharmCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragId = useRef<string | null>(null);

  function posFromEvent(clientX: number, clientY: number) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: clamp(((clientX - rect.left) / rect.width) * 100, 4, 96),
      y: clamp(((clientY - rect.top) / rect.height) * 100, 4, 96),
    };
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const raw = e.dataTransfer.getData(DRAG_MIME);
    if (!raw) return;
    const { variantId, design } = JSON.parse(raw);
    const { x, y } = posFromEvent(e.clientX, e.clientY);
    onDropCharm(variantId, design, x, y);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragId.current) return;
    const { x, y } = posFromEvent(e.clientX, e.clientY);
    onMove(dragId.current, x, y);
  }

  function handlePointerUp(e: React.PointerEvent) {
    dragId.current = null;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-[#a89a80]">{label}</span>
      <div
        ref={canvasRef}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className={`relative rounded-xl overflow-hidden border border-[#eae7de] select-none bg-[#f7f5f0] ${
          wide ? "w-[170px] aspect-[560/660]" : "w-[92px] aspect-[200/660]"
        }`}
      >
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-contain pointer-events-none" />
        )}

        {charms.map((c) => (
          <div
            key={c.instanceId}
            onPointerDown={(e) => {
              dragId.current = c.instanceId;
              (e.target as Element).setPointerCapture?.(e.pointerId);
            }}
            className="group absolute h-7 w-7 -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing touch-none"
            style={{ left: `${c.x}%`, top: `${c.y}%` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={entries.find((e) => e.variantId === c.variantId)?.imageUrl}
              alt={c.design}
              className="h-full w-full object-contain drop-shadow-md pointer-events-none"
            />
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => onRemove(c.instanceId)}
              className="absolute -top-1.5 -right-1.5 hidden h-4 w-4 items-center justify-center rounded-full bg-[#1c1c1a] text-white text-[10px] leading-none group-hover:flex"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CharmsStep({ product, charmProduct, selection, journalImageUrl, onChange }: CharmsStepProps) {
  const charms = selection.charms;
  const entries = buildCharmEntries(charmProduct);

  function addCharm(side: CharmSide, variantId: string, design: string, x: number, y: number) {
    onChange([...charms, newPlacement(variantId, design, side, x, y)]);
  }

  function removeCharm(instanceId: string) {
    onChange(charms.filter((c) => c.instanceId !== instanceId));
  }

  function updatePosition(instanceId: string, x: number, y: number) {
    onChange(charms.map((c) => (c.instanceId === instanceId ? { ...c, x, y } : c)));
  }

  const imageFor = (viewKey: CharmSide) =>
    viewKey === "front" ? journalImageUrl : resolveSideImage(product, viewKey, selection);

  const totalCharms = charms.length;

  return (
    <div>
      <h2 className="text-3xl font-serif text-[#1c1c1a]">Add charms</h2>
      <p className="mt-2 text-[#6b6a63]">
        Drag a charm onto the front, back, or side cover — place as many as you like.
      </p>

      <div className="mt-6 flex flex-wrap gap-6">
        {entries.map((c) => (
          <div
            key={c.variantId}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData(DRAG_MIME, JSON.stringify({ variantId: c.variantId, design: c.design }));
              e.dataTransfer.effectAllowed = "copy";
            }}
            onClick={() => addCharm("front", c.variantId, c.design, 50, 45)}
            className="flex cursor-grab flex-col items-center gap-2 group active:cursor-grabbing"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-transparent bg-[#f7f5f0] group-hover:border-[#0f3d34]/30 transition-colors">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.imageUrl} alt="" className="h-11 w-11 object-contain pointer-events-none" />
            </span>
            <span className="text-sm text-[#2a2a28]">{c.design}</span>
            <span className="text-xs text-[#b1632f] -mt-1">{formatIDR(c.price)}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-lg bg-[#f7f5f0] px-4 py-3 text-xs text-[#6b6a63]">
        <span aria-hidden>💡</span>
        <span>
          Drag a charm from above and drop it onto any view below to place it there. Once placed, drag a
          charm to fine-tune its spot, or click the × that appears on hover to remove it. You can mix
          charms across front, back, and side.
        </span>
      </div>

      <div className="mt-6 flex flex-wrap items-start gap-8">
        {VIEWS.map((v) => (
          <CharmCanvas
            key={v.key}
            label={v.label}
            wide={v.wide}
            imageUrl={imageFor(v.key)}
            charms={charms.filter((c) => c.side === v.key)}
            entries={entries}
            onDropCharm={(variantId, design, x, y) => addCharm(v.key, variantId, design, x, y)}
            onMove={updatePosition}
            onRemove={removeCharm}
          />
        ))}
      </div>

      <p className="mt-6 text-sm text-[#6b6a63]">
        {totalCharms === 0
          ? "No charms added yet."
          : `${totalCharms} charm${totalCharms > 1 ? "s" : ""} placed.`}
      </p>
    </div>
  );
}
