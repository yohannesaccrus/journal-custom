"use client";

import { useRef, useState } from "react";

export default function VariantThumbnail({
  productId,
  variantId,
  imageUrl,
  onUploaded,
}: {
  productId: string;
  variantId: string;
  imageUrl: string | null;
  onUploaded: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  async function upload(file: File) {
    if (!file.type.startsWith("image/")) return;
    setError(false);
    setUploading(true);
    setPreview(URL.createObjectURL(file));

    const form = new FormData();
    form.append("productId", productId);
    form.append("variantId", variantId);
    form.append("file", file);

    try {
      const res = await fetch("/api/admin/assets/image", { method: "POST", body: form });
      if (!res.ok) throw new Error();
      onUploaded();
    } catch {
      setError(true);
      setPreview(null);
    } finally {
      setUploading(false);
    }
  }

  const displaySrc = preview ?? imageUrl;

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) upload(file);
      }}
      title={displaySrc ? "Click or drop an image to replace" : "Click or drop an image to upload"}
      className={`group/thumb relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border transition-all duration-150 ${
        dragOver ? "border-[#0f3d34] ring-2 ring-[#0f3d34]/15" : "border-[#e8e3d8] hover:border-[#0f3d34]/50"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
          e.target.value = "";
        }}
      />

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

      <div
        className={`absolute inset-0 flex items-center justify-center bg-black/40 text-white backdrop-blur-[2px] opacity-0 transition-opacity duration-150 group-hover/thumb:opacity-100 ${
          uploading ? "opacity-100" : ""
        }`}
      >
        {uploading ? (
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        ) : (
          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-8.5 8.5a1 1 0 01-.464.263l-3.5 1a1 1 0 01-1.237-1.237l1-3.5a1 1 0 01.263-.464l8.5-8.5z" />
          </svg>
        )}
      </div>

      {error && (
        <div className="absolute inset-x-0 -bottom-px h-1 bg-[#b5342c]" title="Upload failed, try again" />
      )}
    </button>
  );
}
