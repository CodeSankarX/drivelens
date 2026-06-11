import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { TagChip } from '@/components/ui/TagChip';
import { PlusIcon } from '@/components/ui/Icon';
import { addTag, removeTag } from '@/lib/db/mutations';
import { useTags } from '@/hooks/useTags';
import { cn } from '@/lib/cn';

interface TagPopoverProps {
  driveFileId: string;
  currentTags: string[];
  /** Anchor element the popover positions against. */
  anchor: HTMLElement | null;
  onClose: () => void;
}

/** Floating editor for adding/removing tags on a file (optimistic writes). */
export function TagPopover({
  driveFileId,
  currentTags,
  anchor,
  onClose,
}: TagPopoverProps) {
  const allTags = useTags();
  const [input, setInput] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Position below the anchor, kept within the viewport.
  useEffect(() => {
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    const width = 260;
    const left = Math.min(r.left, window.innerWidth - width - 12);
    setPos({ top: r.bottom + 6, left: Math.max(12, left) });
  }, [anchor]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (
        ref.current &&
        !ref.current.contains(e.target as Node) &&
        anchor &&
        !anchor.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [anchor, onClose]);

  const colorFor = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of allTags ?? []) m.set(t.name, t.color);
    return (name: string) => m.get(name) ?? '#6366f1';
  }, [allTags]);

  const suggestions = useMemo(() => {
    const q = input.trim().toLowerCase();
    return (allTags ?? [])
      .filter(
        (t) =>
          !currentTags.includes(t.name) &&
          (!q || t.name.toLowerCase().includes(q)),
      )
      .slice(0, 6);
  }, [allTags, input, currentTags]);

  const trimmed = input.trim();
  const canCreate =
    trimmed.length > 0 &&
    !currentTags.some((t) => t.toLowerCase() === trimmed.toLowerCase()) &&
    !(allTags ?? []).some((t) => t.name.toLowerCase() === trimmed.toLowerCase());

  const commit = (tag: string) => {
    void addTag(driveFileId, tag);
    setInput('');
    inputRef.current?.focus();
  };

  if (!pos) return null;

  return createPortal(
    <div
      ref={ref}
      className="fixed z-[60] w-[260px] rounded-xl border border-border bg-bg-overlay p-3 shadow-overlay animate-scale-in"
      style={{ top: pos.top, left: pos.left }}
    >
      <div className="mb-2 flex flex-wrap gap-1">
        {currentTags.length === 0 && (
          <span className="text-2xs text-content-tertiary">No tags yet</span>
        )}
        {currentTags.map((t) => (
          <TagChip
            key={t}
            name={t}
            color={colorFor(t)}
            onRemove={() => void removeTag(driveFileId, t)}
          />
        ))}
      </div>

      <input
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && trimmed) {
            e.preventDefault();
            commit(trimmed);
          }
        }}
        placeholder="Add a tag…"
        className="w-full rounded-lg border border-border bg-bg-base px-2.5 py-1.5 text-sm outline-none placeholder:text-content-tertiary focus:border-accent"
      />

      <div className="mt-2 max-h-44 overflow-y-auto">
        {canCreate && (
          <button
            type="button"
            onClick={() => commit(trimmed)}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-content-secondary hover:bg-bg-raised hover:text-content-primary"
          >
            <PlusIcon size={14} />
            Create “{trimmed}”
          </button>
        )}
        {suggestions.map((t) => (
          <button
            key={t.name}
            type="button"
            onClick={() => commit(t.name)}
            className={cn(
              'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-bg-raised',
            )}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: t.color }}
            />
            <span className="truncate text-content-primary">{t.name}</span>
          </button>
        ))}
        {!canCreate && suggestions.length === 0 && (
          <p className="px-2 py-1.5 text-2xs text-content-tertiary">
            Type to create a new tag.
          </p>
        )}
      </div>
    </div>,
    document.body,
  );
}
