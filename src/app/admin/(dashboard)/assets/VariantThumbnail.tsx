"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";

export default function VariantThumbnail({
  productId,
  variantId,
  imageUrl,
  onUploaded,
  caption,
  uploadUrl = "/api/admin/assets/image",
  extraFormFields,
  clearable = false,
  onCleared,
}: {
  productId: string;
  variantId: string;
  imageUrl: string | null;
  onUploaded: () => void;
  /** Small label under the thumbnail clarifying where this image is actually seen — e.g. "Admin only" vs "Shown to customer". Omit to show nothing. */
  caption?: string;
  /** POST endpoint for uploads. Defaults to the standard variant-image endpoint. */
  uploadUrl?: string;
  /** Extra fields to append to the upload form body beyond productId/variantId/file (e.g. for endpoints that don't need productId). */
  extraFormFields?: Record<string, string>;
  /** Show a "Clear" action in the modal, calling `onCleared` (e.g. to delete a metafield override instead of just replacing it). */
  clearable?: boolean;
  onCleared?: () => Promise<void>;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  async function upload(file: File) {
    if (!file.type.startsWith("image/")) return;
    setError(false);
    setUploading(true);
    setPreview(URL.createObjectURL(file));

    const form = new FormData();
    form.append("productId", productId);
    form.append("variantId", variantId);
    if (extraFormFields) {
      for (const [key, value] of Object.entries(extraFormFields)) form.append(key, value);
    }
    form.append("file", file);

    try {
      const res = await fetch(uploadUrl, { method: "POST", body: form });
      if (!res.ok) throw new Error();
      onUploaded();
    } catch {
      setError(true);
      setPreview(null);
    } finally {
      setUploading(false);
    }
  }

  async function clear() {
    if (!onCleared) return;
    setClearing(true);
    try {
      await onCleared();
      setPreview(null);
      onUploaded();
      setModalOpen(false);
    } catch {
      setError(true);
    } finally {
      setClearing(false);
    }
  }

  const displaySrc = preview ?? imageUrl;

  return (
    <div className="flex w-11 flex-col items-center gap-1">
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        title="View image"
        className="group/thumb relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-[#e8e3d8] transition-all duration-150 hover:border-[#0f3d34]/50"
      >
        {displaySrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={displaySrc} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#f7f5f0] to-[#ece4d3] text-[#a89a80]">
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l3.5-4.5 2.5 3L14 7l4 8H16z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )}

        <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-150 group-hover/thumb:bg-black/30 group-hover/thumb:opacity-100">
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-white">
            <path
              d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white backdrop-blur-[2px]">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          </div>
        )}

        {error && <div className="absolute inset-x-0 -bottom-px h-1 bg-[#b5342c]" title="Upload failed, try again" />}
      </button>

      {caption && (
        <span className="text-center text-[9px] leading-tight text-[#a89a80]" title={caption}>
          {caption}
        </span>
      )}

      {modalOpen && (
        <ImageModal
          imageUrl={displaySrc}
          uploading={uploading}
          error={error}
          onUpload={upload}
          onClose={() => setModalOpen(false)}
          clearable={clearable && !!imageUrl}
          clearing={clearing}
          onClear={onCleared ? clear : undefined}
        />
      )}
    </div>
  );
}

function ImageModal({
  imageUrl,
  uploading,
  error,
  onUpload,
  onClose,
  clearable = false,
  clearing = false,
  onClear,
}: {
  imageUrl: string | null;
  uploading: boolean;
  error: boolean;
  onUpload: (file: File) => void;
  onClose: () => void;
  clearable?: boolean;
  clearing?: boolean;
  onClear?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#0a2b25]/60 backdrop-blur-sm" onClick={onClose} />

      <div className="animate-[popIn_0.15s_ease-out] relative flex w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-white/70 bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-[#eae7de] px-5 py-3.5">
          <p className="text-sm font-medium text-[#1c1c1a]">Variant image</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-full p-1.5 text-[#a89a80] transition-colors hover:bg-[#f0ece0] hover:text-[#1c1c1a]"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="p-5">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files?.[0];
              if (file) onUpload(file);
            }}
            className={`relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition-colors ${
              dragOver ? "border-[#0f3d34] bg-[#0f3d34]/5" : "border-[#e8e3d8] bg-[#f7f5f0]"
            }`}
          >
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="" className="h-full w-full object-contain p-3" />
            ) : (
              <span className="px-6 text-center text-xs text-[#a89a80]">No image set yet — drop one here or use the button below.</span>
            )}

            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white backdrop-blur-[2px]">
                <svg className="h-6 w-6 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              </div>
            )}
          </div>

          {error && <p className="mt-2 text-xs text-[#b5342c]">Upload failed — try again.</p>}

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(file);
              e.target.value = "";
            }}
          />

          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#154a3f] to-[#0f3d34] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:from-[#0f3d34] hover:to-[#0a2b25] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-8.5 8.5a1 1 0 01-.464.263l-3.5 1a1 1 0 01-1.237-1.237l1-3.5a1 1 0 01.263-.464l8.5-8.5z" />
            </svg>
            {imageUrl ? "Replace image" : "Upload image"}
          </button>

          {clearable && onClear && (
            <button
              type="button"
              disabled={uploading || clearing}
              onClick={onClear}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-full border border-[#e8e3d8] px-4 py-2 text-xs font-medium text-[#b5342c] transition-colors hover:bg-[#fdf2f0] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {clearing ? "Clearing…" : "Clear override"}
            </button>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes popIn {
          0% {
            opacity: 0;
            transform: scale(0.96);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>,
    document.body
  );
}
