import { Command } from 'cmdk';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CategoryIcon, SearchIcon, StarIcon } from '@/components/ui/Icon';
import { TagChip } from '@/components/ui/TagChip';
import { useSearch } from '@/hooks/useSearch';
import { useTagColors } from '@/hooks/useTags';
import { useTags } from '@/hooks/useTags';
import { useUIStore } from '@/store/uiStore';
import { formatDate } from '@/lib/mime';
import type { FileCategory } from '@/types';

const TYPE_HINTS: FileCategory[] = [
  'document',
  'image',
  'video',
  'pdf',
  'spreadsheet',
];

/**
 * Cmd+K command palette. Supports `tag:`, `type:`, and fuzzy free text via
 * the shared parser + Fuse.js. cmdk handles arrow/enter keyboard navigation;
 * our own filtering is authoritative so we disable cmdk's built-in matching.
 */
export function CommandPalette() {
  const open = useUIStore((s) => s.paletteOpen);
  const setOpen = useUIStore((s) => s.setPaletteOpen);
  const setPreviewFile = useUIStore((s) => s.setPreviewFile);

  const [query, setQuery] = useState('');
  const { results } = useSearch(query);
  const tagColors = useTagColors();
  const tags = useTags();

  useEffect(() => {
    if (open) setQuery('');
  }, [open]);

  if (!open) return null;

  const close = () => setOpen(false);
  const showHints = query.trim().length === 0;

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center bg-black/60 p-4 pt-[12vh] backdrop-blur-sm animate-fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <Command
        shouldFilter={false}
        loop
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            close();
          }
        }}
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-bg-raised shadow-overlay animate-scale-in"
      >
        <div className="flex items-center gap-2.5 border-b border-border-subtle px-4">
          <SearchIcon size={18} className="shrink-0 text-content-tertiary" />
          <Command.Input
            autoFocus
            value={query}
            onValueChange={setQuery}
            placeholder="Search files…  try tag:design or type:pdf"
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-content-tertiary"
          />
          <kbd className="rounded border border-border bg-bg-base px-1.5 py-0.5 text-2xs text-content-tertiary">
            Esc
          </kbd>
        </div>

        <Command.List className="max-h-[52vh] overflow-y-auto p-2">
          <Command.Empty className="py-10 text-center text-sm text-content-tertiary">
            No matching files.
          </Command.Empty>

          {showHints && (
            <div className="px-2 pb-2">
              <p className="px-1 pb-1.5 pt-1 text-2xs font-medium uppercase tracking-wider text-content-tertiary">
                Filter by type
              </p>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {TYPE_HINTS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setQuery(`type:${t} `)}
                    className="flex items-center gap-1.5 rounded-md border border-border bg-bg-subtle px-2 py-1 text-2xs text-content-secondary hover:border-border-strong"
                  >
                    <CategoryIcon category={t} size={13} />
                    {t}
                  </button>
                ))}
              </div>
              {tags && tags.length > 0 && (
                <>
                  <p className="px-1 pb-1.5 pt-1 text-2xs font-medium uppercase tracking-wider text-content-tertiary">
                    Filter by tag
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.slice(0, 8).map((t) => (
                      <button
                        key={t.name}
                        onClick={() => setQuery(`tag:${t.name} `)}
                      >
                        <TagChip name={t.name} color={t.color} />
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {results.length > 0 && (
            <Command.Group
              heading={
                <span className="px-1 text-2xs font-medium uppercase tracking-wider text-content-tertiary">
                  {results.length} result{results.length === 1 ? '' : 's'}
                </span>
              }
            >
              {results.slice(0, 50).map((file) => (
                <Command.Item
                  key={file.id}
                  value={file.id}
                  onSelect={() => {
                    setPreviewFile(file);
                    close();
                  }}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm aria-selected:bg-accent-subtle"
                >
                  <CategoryIcon
                    category={file.category}
                    size={17}
                    className="shrink-0 text-content-tertiary"
                  />
                  <span className="min-w-0 flex-1 truncate">{file.name}</span>
                  <div className="hidden items-center gap-1 sm:flex">
                    {file.tags.slice(0, 2).map((t) => (
                      <TagChip key={t} name={t} color={tagColors.get(t)} />
                    ))}
                  </div>
                  {file.favorite && (
                    <StarIcon size={14} filled className="text-star" />
                  )}
                  <span className="hidden w-16 shrink-0 text-right text-2xs text-content-tertiary md:block">
                    {formatDate(file.modifiedTime)}
                  </span>
                </Command.Item>
              ))}
            </Command.Group>
          )}
        </Command.List>

        <div className="flex items-center gap-3 border-t border-border-subtle px-4 py-2 text-2xs text-content-tertiary">
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span className="ml-auto">tag: · type: · free text</span>
        </div>
      </Command>
    </div>,
    document.body,
  );
}
