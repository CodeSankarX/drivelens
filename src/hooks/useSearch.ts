import Fuse from 'fuse.js';
import { useMemo } from 'react';
import { parseQuery } from '@/lib/search/parseQuery';
import type { MergedFile } from '@/types';
import { useMergedFiles } from './useFiles';

/**
 * Search the merged file list with a parsed query. `tag:` and `type:` filters
 * narrow the candidate set; free text is fuzzy-matched with Fuse.js.
 */
export function useSearch(rawQuery: string): {
  results: MergedFile[];
  loading: boolean;
} {
  const merged = useMergedFiles();

  const fuse = useMemo(() => {
    if (!merged) return null;
    return new Fuse(merged, {
      keys: [
        { name: 'name', weight: 0.7 },
        { name: 'tags', weight: 0.3 },
      ],
      threshold: 0.4,
      ignoreLocation: true,
      minMatchCharLength: 2,
    });
  }, [merged]);

  const results = useMemo(() => {
    if (!merged) return [];
    const parsed = parseQuery(rawQuery);

    let candidates = merged;
    if (parsed.types.length > 0) {
      candidates = candidates.filter((f) => parsed.types.includes(f.category));
    }
    if (parsed.tags.length > 0) {
      candidates = candidates.filter((f) =>
        parsed.tags.every((t) =>
          f.tags.some((ft) => ft.toLowerCase() === t),
        ),
      );
    }

    if (!parsed.text) {
      // No free text: return filtered set, most recent first.
      return [...candidates].sort(
        (a, b) =>
          new Date(b.modifiedTime).getTime() -
          new Date(a.modifiedTime).getTime(),
      );
    }

    // Fuzzy match within the filtered candidates.
    const localFuse =
      candidates.length === merged.length
        ? fuse
        : new Fuse(candidates, {
            keys: [
              { name: 'name', weight: 0.7 },
              { name: 'tags', weight: 0.3 },
            ],
            threshold: 0.4,
            ignoreLocation: true,
            minMatchCharLength: 2,
          });

    if (!localFuse) return candidates;
    return localFuse.search(parsed.text).map((r) => r.item);
  }, [merged, fuse, rawQuery]);

  return { results, loading: merged === undefined };
}
