import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db/dexie';
import type { Tag } from '@/types';

/** All known tags, sorted by name. */
export function useTags(): Tag[] | undefined {
  return useLiveQuery(
    async () => (await db.tags.toArray()).sort((a, b) => a.name.localeCompare(b.name)),
    [],
  );
}

/** Lookup map from tag name to color, for rendering chips. */
export function useTagColors(): Map<string, string> {
  const tags = useTags();
  const map = new Map<string, string>();
  for (const t of tags ?? []) map.set(t.name, t.color);
  return map;
}
