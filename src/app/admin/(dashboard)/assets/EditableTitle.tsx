"use client";

import { useRef, useState } from "react";

export default function EditableTitle({
  value,
  onSave,
}: {
  value: string;
  onSave: (title: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function commit() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === value) {
      setDraft(value);
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(trimmed);
      setEditing(false);
    } catch {
      setDraft(value);
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        disabled={saving}
        autoFocus
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") inputRef.current?.blur();
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        className="font-medium text-base rounded-md border border-[#0f3d34] px-2 py-0.5 -mx-2 outline-none focus:ring-2 focus:ring-[#0f3d34]/10 disabled:opacity-60"
      />
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="group/title flex items-center gap-1.5 rounded-md -mx-2 px-2 py-0.5 text-left transition-colors hover:bg-gradient-to-r hover:from-[#f2ece1] hover:to-transparent"
    >
      <span className="font-medium">{value}</span>
      <svg
        className="h-3 w-3 shrink-0 text-[#a89a80] opacity-0 transition-opacity group-hover/title:opacity-100"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path d="M13.586 3.586a2 2 0 112.828 2.828l-8.5 8.5a1 1 0 01-.464.263l-3.5 1a1 1 0 01-1.237-1.237l1-3.5a1 1 0 01.263-.464l8.5-8.5z" />
      </svg>
    </button>
  );
}
