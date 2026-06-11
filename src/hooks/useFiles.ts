import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { db, getPrefs } from '@/lib/db/dexie';
import type {
  FileMeta,
  MergedFile,
  Prefs,
  SidebarView,
  SortKey,
} from '@/types';

/** Join cached Drive rows with user metadata into the render shape. */
export function useMergedFiles(): MergedFile[] | undefined {
  const driveFiles = useLiveQuery(() => db.driveFiles.toArray(), []);
  const metas = useLiveQuery(() => db.fileMeta.toArray(), []);

  return useMemo(() => {
    if (!driveFiles) return undefined;
    const metaById = new Map<string, FileMeta>(
      (metas ?? []).map((m) => [m.driveFileId, m]),
    );
    return driveFiles.map<MergedFile>((f) => {
      const meta = metaById.get(f.id);
      return {
        ...f,
        tags: meta?.tags ?? [],
        favorite: meta?.favorite ?? false,
        lastViewed: meta?.lastViewed,
      };
    });
  }, [driveFiles, metas]);
}

export function usePrefs(): Prefs | undefined {
  return useLiveQuery(() => getPrefs(), []);
}

function sortFiles(files: MergedFile[], key: SortKey, dir: 'asc' | 'desc') {
  const sign = dir === 'asc' ? 1 : -1;
  const sorted = [...files].sort((a, b) => {
    switch (key) {
      case 'name':
        return sign * a.name.localeCompare(b.name);
      case 'size':
        return sign * ((a.size ?? 0) - (b.size ?? 0));
      case 'modified':
      default:
        return (
          sign *
          (new Date(a.modifiedTime).getTime() -
            new Date(b.modifiedTime).getTime())
        );
    }
  });
  return sorted;
}

/** Apply a sidebar view filter to the merged file list. */
export function filterByView(
  files: MergedFile[],
  view: SidebarView,
): MergedFile[] {
  switch (view.kind) {
    case 'smart':
      switch (view.id) {
        case 'recent':
          return files; // sorted by modified elsewhere
        case 'starred':
          return files.filter((f) => f.starred);
        case 'favorites':
          return files.filter((f) => f.favorite);
        case 'all':
        default:
          return files;
      }
    case 'category':
      return files.filter((f) => f.category === view.id);
    case 'tag':
      return files.filter((f) => f.tags.includes(view.tag));
  }
}

/**
 * The list shown by the dashboard for the active sidebar view, sorted by prefs.
 * Returns `undefined` while data is still loading.
 */
export function useViewFiles(view: SidebarView): MergedFile[] | undefined {
  const merged = useMergedFiles();
  const prefs = usePrefs();
  return useMemo(() => {
    if (!merged) return undefined;
    const filtered = filterByView(merged, view);
    // The "recent" view always sorts by modified desc regardless of prefs.
    if (view.kind === 'smart' && view.id === 'recent') {
      return sortFiles(filtered, 'modified', 'desc');
    }
    return sortFiles(
      filtered,
      prefs?.sortKey ?? 'modified',
      prefs?.sortDir ?? 'desc',
    );
  }, [merged, view, prefs]);
}

/** Count of files per category, for sidebar badges. */
export function useCategoryCounts():
  | Partial<Record<MergedFile['category'], number>>
  | undefined {
  const merged = useMergedFiles();
  return useMemo(() => {
    if (!merged) return undefined;
    const counts: Partial<Record<MergedFile['category'], number>> = {};
    for (const f of merged) counts[f.category] = (counts[f.category] ?? 0) + 1;
    return counts;
  }, [merged]);
}

export function useFavoriteCount(): number | undefined {
  const merged = useMergedFiles();
  return useMemo(
    () => (merged ? merged.filter((f) => f.favorite).length : undefined),
    [merged],
  );
}
