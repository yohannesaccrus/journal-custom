"use client";

import { useRef } from "react";
import {
  buildCharmEntries,
  canPlaceCharm,
  charmSideLimit,
  MAX_CHARMS_FRONT,
  MAX_CHARMS_SIDE,
  MAX_CHARMS_TOTAL,
  PATCH_POSITION,
  resolveSideImage,
  type CharmEntry,
} from "@/lib/catalog";
import { useCurrencyFormat } from "@/components/CurrencyContext";
import { PatchIcon } from "@/components/PatchIcon";
import type { ShopifyJournalProduct } from "@/lib/shopify-admin";
import type { CharmSide, JournalSelection, PlacedCharm } from "@/lib/types";
import { DisabledHint } from "@/components/DisabledHint";

interface CharmsStepProps {
  product: ShopifyJournalProduct;
  charmProduct: ShopifyJournalProduct;
  selection: JournalSelection;
  journalImageUrl: string;
  onChange: (charms: PlacedCharm[]) => void;
  activeSide: CharmSide;
  onSelectSide: (side: CharmSide) => void;
}

const VIEWS: { key: CharmSide; label: string; wide: boolean }[] = [
  { key: "front", label: "Front", wide: true },
  { key: "side", label: "Side", wide: false },
  { key: "back", label: "Back", wide: true },
];

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/** Generates a placement outside the component so the impure Date/Math calls aren't part of render scope. */
export function newPlacement(variantId: string, design: string, side: CharmSide, x: number, y: number): PlacedCharm {
  return {
    instanceId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    variantId,
    design,
    side,
    x,
    y,
  };
}

export const DRAG_MIME = "application/x-sanaya-charm";

interface CharmCanvasProps {
  label: string;
  wide: boolean;
  imageUrl: string | undefined;
  patch?: JournalSelection["patch"];
  charms: PlacedCharm[];
  limit: number | null;
  atLimit: boolean;
  entries: CharmEntry[];
  active: boolean;
  onSelect: () => void;
  onDropCharm: (variantId: string, design: string, x: number, y: number) => void;
  onMove: (instanceId: string, x: number, y: number) => void;
  onRemove: (instanceId: string) => void;
}

function CharmCanvas({
  label,
  wide,
  imageUrl,
  patch,
  charms,
  limit,
  atLimit,
  entries,
  active,
  onSelect,
  onDropCharm,
  onMove,
  onRemove,
}: CharmCanvasProps) {
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
    if (atLimit) return;
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

  // Matches the charm's on-cover scale in the main preview (32px charm on a
  // 320px-wide, 560x660 front cover) so a charm looks the same physical size
  // here as it does over on the left. Front/back canvases share the front
  // cover's 560x660 aspect at 170px wide; the side canvas uses the spine's
  // 200x660 aspect at 92px wide — scaling off canvas height (the shared 660
  // unit) keeps both consistent with the main preview.
  const CHARM_ICON_SIZE = wide ? 17 : 26;

  return (
    <div className="flex flex-col items-center gap-2">
      <button type="button" onClick={onSelect} className="flex items-center gap-1.5">
        <span
          className={`text-xs font-medium uppercase tracking-wide transition-colors ${
            active ? "text-[var(--accent)]" : "text-[var(--faint)] hover:text-[var(--muted)]"
          }`}
        >
          {label}
        </span>
        {limit !== null && (
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none tabular-nums shadow-sm transition-colors ${
              atLimit
                ? "bg-[var(--brand)] text-white"
                : charms.length > 0
                  ? "bg-[var(--accent)] text-white"
                  : "border border-[var(--border)] bg-white text-[var(--muted)]"
            }`}
          >
            {charms.length}/{limit}
          </span>
        )}
      </button>
      <div
        ref={canvasRef}
        onClick={onSelect}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        title={atLimit ? "This view is full" : undefined}
        className={`relative rounded-[var(--radius-panel)] overflow-hidden border-2 select-none bg-[var(--surface-soft)] transition-colors cursor-pointer ${
          active ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/20" : "border-[var(--border)] hover:border-[var(--accent)]/30"
        } ${wide ? "w-[170px] aspect-[560/660]" : "w-[92px] aspect-[200/660]"}`}
      >
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-contain pointer-events-none" />
        )}

        {patch && patch !== "none" && (
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${PATCH_POSITION.x}%`,
              top: `${PATCH_POSITION.y}%`,
              width: `${PATCH_POSITION.sizePercent}%`,
              aspectRatio: "1",
            }}
          >
            <PatchIcon shape={patch} className="h-full w-full drop-shadow-md" />
          </div>
        )}

        {charms.map((c) => (
          <div
            key={c.instanceId}
            onPointerDown={(e) => {
              dragId.current = c.instanceId;
              (e.target as Element).setPointerCapture?.(e.pointerId);
            }}
            className="group absolute -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing touch-none"
            style={{ left: `${c.x}%`, top: `${c.y}%`, width: CHARM_ICON_SIZE, height: CHARM_ICON_SIZE }}
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
              className="absolute -top-1.5 -right-1.5 hidden h-4 w-4 items-center justify-center rounded-full bg-[var(--ink)] text-white text-[10px] leading-none group-hover:flex"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CharmsStep({
  product,
  charmProduct,
  selection,
  journalImageUrl,
  onChange,
  activeSide,
  onSelectSide,
}: CharmsStepProps) {
  const { format } = useCurrencyFormat();
  const charms = selection.charms;
  const entries = buildCharmEntries(charmProduct);

  function addCharm(side: CharmSide, variantId: string, design: string, x: number, y: number) {
    if (!canPlaceCharm(charms, side)) return;
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
  const activeSideAtLimit = !canPlaceCharm(charms, activeSide);
  const totalAtLimit = totalCharms >= MAX_CHARMS_TOTAL;

  return (
    <div className="step-fade-in">
      <h2 className="text-xl font-heading text-[var(--ink)]">Add charms</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Drag a charm onto the front, back, or side cover — up to {MAX_CHARMS_TOTAL} per journal.
      </p>

      <div className="mt-4 flex flex-wrap gap-4">
        {entries.map((c) => {
          const disabled = !c.inStock || activeSideAtLimit;
          return (
            <DisabledHint
              key={c.variantId}
              message={!c.inStock ? "Out of stock" : totalAtLimit ? `${MAX_CHARMS_TOTAL} charm limit reached` : activeSideAtLimit ? `${activeSide} is full` : null}
            >
              <div
                draggable={!disabled}
                onDragStart={(e) => {
                  if (disabled) return;
                  e.dataTransfer.setData(DRAG_MIME, JSON.stringify({ variantId: c.variantId, design: c.design }));
                  e.dataTransfer.effectAllowed = "copy";
                }}
                onClick={() => !disabled && addCharm(activeSide, c.variantId, c.design, 50, 45)}
                className={`flex flex-col items-center gap-1.5 group ${
                  disabled ? "cursor-not-allowed opacity-40" : "cursor-grab active:cursor-grabbing"
                }`}
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-chip)] border-2 border-transparent bg-[var(--surface-soft)] group-hover:border-[var(--accent)]/30 transition-colors">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.imageUrl} alt="" className="h-7 w-7 object-contain pointer-events-none" />
                </span>
                <span className="text-xs text-[var(--ink)]">{c.design}</span>
                <span className="text-[10px] text-[var(--brand)] -mt-1">{format(c.price)}</span>
              </div>
            </DisabledHint>
          );
        })}
      </div>

      <div className="mt-3 flex items-start gap-2 rounded-lg bg-[var(--surface-soft)] px-3 py-2 text-xs text-[var(--muted)]">
        <span aria-hidden>💡</span>
        <span>
          Drag a charm from above and drop it onto any view below to place it there. Once placed, drag a
          charm to fine-tune its spot, or click the × that appears on hover to remove it. Mix charms across
          front, side, and back — up to {MAX_CHARMS_FRONT} on the front, {MAX_CHARMS_SIDE} on the side,{" "}
          {MAX_CHARMS_TOTAL} in total.
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-start gap-6">
        {VIEWS.map((v) => {
          const sideCharms = charms.filter((c) => c.side === v.key);
          const limit = charmSideLimit(v.key);
          return (
            <CharmCanvas
              key={v.key}
              label={v.label}
              wide={v.wide}
              imageUrl={imageFor(v.key)}
              patch={v.key === "front" ? selection.patch : undefined}
              charms={sideCharms}
              limit={limit}
              atLimit={totalAtLimit || (limit !== null && sideCharms.length >= limit)}
              entries={entries}
              active={activeSide === v.key}
              onSelect={() => onSelectSide(v.key)}
              onDropCharm={(variantId, design, x, y) => {
                onSelectSide(v.key);
                addCharm(v.key, variantId, design, x, y);
              }}
              onMove={updatePosition}
              onRemove={removeCharm}
            />
          );
        })}
      </div>

      <p className="mt-4 text-sm text-[var(--muted)]">
        {totalCharms === 0 ? "No charms added yet." : `${totalCharms} of ${MAX_CHARMS_TOTAL} charms placed.`}
      </p>
    </div>
  );
}
