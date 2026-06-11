import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { FileGridSkeleton } from '@/components/ui/Skeleton';
import {
  GridIcon,
  ListIcon,
  LogoutIcon,
  RefreshIcon,
  SearchIcon,
} from '@/components/ui/Icon';
import { FileGrid } from './FileGrid';
import { EmptyState } from './EmptyState';
import { useViewFiles, usePrefs } from '@/hooks/useFiles';
import { useTagColors } from '@/hooks/useTags';
import { toggleFavorite } from '@/lib/db/mutations';
import { db, PREFS_ID } from '@/lib/db/dexie';
import { useUIStore } from '@/store/uiStore';
import { categoryLabel } from '@/lib/mime';
import type { AuthApi } from '@/hooks/useAuth';
import type { MergedFile, SidebarView } from '@/types';

interface DashboardProps {
  ready: boolean;
  filesFetched: number;
  onRefresh: () => void;
  auth: AuthApi;
}

function viewTitle(view: SidebarView): string {
  if (view.kind === 'smart') {
    return {
      recent: 'Recent',
      starred: 'Starred in Drive',
      favorites: 'Favorites',
      all: 'All files',
    }[view.id];
  }
  if (view.kind === 'category') return categoryLabel(view.id);
  return `#${view.tag}`;
}

const GRID_COLS_BY_BP = () => {
  const w = window.innerWidth;
  if (w >= 1280) return 5;
  if (w >= 1024) return 4;
  if (w >= 640) return 3;
  return 2;
};

export function Dashboard({
  ready,
  filesFetched,
  onRefresh,
  auth,
}: DashboardProps) {
  const view = useUIStore((s) => s.view);
  const focusedId = useUIStore((s) => s.focusedId);
  const setFocusedId = useUIStore((s) => s.setFocusedId);
  const setPreviewFile = useUIStore((s) => s.setPreviewFile);
  const setPaletteOpen = useUIStore((s) => s.setPaletteOpen);
  const syncing = useUIStore((s) => s.syncing);
  const syncError = useUIStore((s) => s.syncError);

  const files = useViewFiles(view);
  const prefs = usePrefs();
  const tagColors = useTagColors();
  const scrollRef = useRef<HTMLDivElement>(null);

  const openPreview = useCallback(
    (file: MergedFile) => setPreviewFile(file),
    [setPreviewFile],
  );

  const filesRef = useRef<MergedFile[]>([]);
  filesRef.current = files ?? [];

  // Grid keyboard navigation + shortcuts on the focused card.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;
      if (typing) return;
      if (useUIStore.getState().paletteOpen) return;
      if (useUIStore.getState().previewFile) return;

      const list = filesRef.current;
      if (list.length === 0) return;
      const cols = GRID_COLS_BY_BP();
      const curIdx = list.findIndex(
        (f) => f.id === useUIStore.getState().focusedId,
      );

      const move = (next: number) => {
        e.preventDefault();
        const clamped = Math.max(0, Math.min(list.length - 1, next));
        const id = list[clamped].id;
        setFocusedId(id);
        document
          .querySelector(`[data-file-id="${id}"]`)
          ?.scrollIntoView({ block: 'nearest' });
      };

      switch (e.key) {
        case 'ArrowRight':
          move(curIdx < 0 ? 0 : curIdx + 1);
          break;
        case 'ArrowLeft':
          move(curIdx < 0 ? 0 : curIdx - 1);
          break;
        case 'ArrowDown':
          move(curIdx < 0 ? 0 : curIdx + cols);
          break;
        case 'ArrowUp':
          move(curIdx < 0 ? 0 : curIdx - cols);
          break;
        case 'Enter':
          if (curIdx >= 0) {
            e.preventDefault();
            openPreview(list[curIdx]);
          }
          break;
        case 'f':
        case 'F':
          if (curIdx >= 0) {
            e.preventDefault();
            void toggleFavorite(list[curIdx].id);
          }
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setFocusedId, openPreview]);

  const setViewMode = (mode: 'grid' | 'list') => {
    void db.prefs.update(PREFS_ID, { viewMode: mode });
  };

  const subtitle = useMemo(() => {
    if (files === undefined) return 'Loading…';
    const n = files.length;
    return `${n} ${n === 1 ? 'file' : 'files'}`;
  }, [files]);

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-border-subtle px-5 py-3.5">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold">
            {viewTitle(view)}
          </h2>
          <p className="text-2xs text-content-tertiary">{subtitle}</p>
        </div>

        <button
          onClick={() => setPaletteOpen(true)}
          className="hidden items-center gap-2 rounded-lg border border-border bg-bg-subtle px-3 py-1.5 text-sm text-content-tertiary transition-colors hover:border-border-strong hover:text-content-secondary sm:flex"
        >
          <SearchIcon size={15} />
          <span>Search</span>
          <kbd className="ml-2 rounded border border-border bg-bg-base px-1.5 py-0.5 text-2xs">
            ⌘K
          </kbd>
        </button>

        <div className="flex items-center gap-0.5 rounded-lg border border-border bg-bg-subtle p-0.5">
          <button
            aria-label="Grid view"
            onClick={() => setViewMode('grid')}
            className={`rounded-md p-1.5 ${
              (prefs?.viewMode ?? 'grid') === 'grid'
                ? 'bg-bg-overlay text-content-primary'
                : 'text-content-tertiary hover:text-content-secondary'
            }`}
          >
            <GridIcon size={16} />
          </button>
          <button
            aria-label="List view"
            onClick={() => setViewMode('list')}
            className={`rounded-md p-1.5 ${
              prefs?.viewMode === 'list'
                ? 'bg-bg-overlay text-content-primary'
                : 'text-content-tertiary hover:text-content-secondary'
            }`}
          >
            <ListIcon size={16} />
          </button>
        </div>

        <Button
          variant="ghost"
          size="icon"
          aria-label="Refresh from Drive"
          disabled={syncing}
          onClick={onRefresh}
        >
          {syncing ? <Spinner size={16} /> : <RefreshIcon size={16} />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Sign out"
          onClick={auth.signOut}
        >
          <LogoutIcon size={16} />
        </Button>
      </header>

      {/* Body */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5">
        {syncError && (
          <div className="mb-4 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
            {syncError}
            <button
              onClick={onRefresh}
              className="ml-2 underline underline-offset-2 hover:no-underline"
            >
              Retry
            </button>
          </div>
        )}

        {!ready && files === undefined ? (
          <>
            <p className="mb-4 flex items-center gap-2 text-sm text-content-secondary">
              <Spinner size={14} /> Syncing your Drive
              {filesFetched > 0 && ` · ${filesFetched} files`}…
            </p>
            <FileGridSkeleton />
          </>
        ) : files && files.length > 0 ? (
          prefs?.viewMode === 'list' ? (
            <FileList
              files={files}
              focusedId={focusedId}
              tagColors={tagColors}
              onOpen={openPreview}
              onFocus={setFocusedId}
            />
          ) : (
            <FileGrid
              files={files}
              focusedId={focusedId}
              tagColors={tagColors}
              onOpen={openPreview}
              onFocus={setFocusedId}
            />
          )
        ) : (
          <EmptyState view={view} hasSync={ready} onRefresh={onRefresh} />
        )}
      </div>
    </div>
  );
}

/* Lightweight list view reusing card data. */
import { CategoryIcon, StarIcon } from '@/components/ui/Icon';
import { TagChip } from '@/components/ui/TagChip';
import { formatDate, formatSize } from '@/lib/mime';

function FileList({
  files,
  focusedId,
  tagColors,
  onOpen,
  onFocus,
}: {
  files: MergedFile[];
  focusedId: string | null;
  tagColors: Map<string, string>;
  onOpen: (f: MergedFile) => void;
  onFocus: (id: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border-subtle">
      {files.map((file, i) => (
        <div
          key={file.id}
          role="button"
          tabIndex={0}
          data-file-id={file.id}
          onClick={() => onOpen(file)}
          onMouseEnter={() => onFocus(file.id)}
          onKeyDown={(e) => e.key === 'Enter' && onOpen(file)}
          className={`flex cursor-pointer items-center gap-3 px-3 py-2.5 ${
            i > 0 ? 'border-t border-border-subtle' : ''
          } ${
            focusedId === file.id ? 'bg-accent-subtle' : 'hover:bg-bg-subtle'
          }`}
        >
          <CategoryIcon
            category={file.category}
            size={18}
            className="shrink-0 text-content-tertiary"
          />
          <span className="min-w-0 flex-1 truncate text-sm">{file.name}</span>
          <div className="hidden items-center gap-1 md:flex">
            {file.tags.slice(0, 2).map((t) => (
              <TagChip key={t} name={t} color={tagColors.get(t)} />
            ))}
          </div>
          <span className="hidden w-20 shrink-0 text-right text-2xs text-content-tertiary sm:block">
            {formatSize(file.size)}
          </span>
          <span className="w-24 shrink-0 text-right text-2xs text-content-tertiary">
            {formatDate(file.modifiedTime)}
          </span>
          {file.favorite && (
            <StarIcon size={15} filled className="shrink-0 text-star" />
          )}
        </div>
      ))}
    </div>
  );
}
