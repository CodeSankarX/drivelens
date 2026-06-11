import type { Tag } from '@/types';
import { db, getFileMeta } from './dexie';
import { scheduleSync } from './sync';

/**
 * User-metadata mutations. Each writes to IndexedDB immediately (optimistic,
 * reactive via useLiveQuery) and schedules a debounced appDataFolder sync.
 */

const DEFAULT_TAG_COLORS = [
  '#6366f1',
  '#ec4899',
  '#f59e0b',
  '#10b981',
  '#06b6d4',
  '#8b5cf6',
  '#ef4444',
  '#84cc16',
];

function pickColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return DEFAULT_TAG_COLORS[Math.abs(hash) % DEFAULT_TAG_COLORS.length];
}

async function upsertMeta(
  driveFileId: string,
  apply: (meta: Awaited<ReturnType<typeof getFileMeta>>) => void,
): Promise<void> {
  const meta = await getFileMeta(driveFileId);
  apply(meta);
  meta.updatedAt = Date.now();
  await db.fileMeta.put(meta);
  scheduleSync();
}

export async function toggleFavorite(driveFileId: string): Promise<void> {
  await upsertMeta(driveFileId, (m) => {
    m.favorite = !m.favorite;
  });
}

export async function setFavorite(
  driveFileId: string,
  value: boolean,
): Promise<void> {
  await upsertMeta(driveFileId, (m) => {
    m.favorite = value;
  });
}

export async function ensureTag(name: string): Promise<void> {
  const clean = name.trim();
  if (!clean) return;
  const existing = await db.tags.get(clean);
  if (!existing) {
    const tag: Tag = { name: clean, color: pickColor(clean) };
    await db.tags.put(tag);
    scheduleSync();
  }
}

export async function addTag(
  driveFileId: string,
  rawTag: string,
): Promise<void> {
  const tag = rawTag.trim();
  if (!tag) return;
  await ensureTag(tag);
  await upsertMeta(driveFileId, (m) => {
    if (!m.tags.includes(tag)) m.tags = [...m.tags, tag];
  });
}

export async function removeTag(
  driveFileId: string,
  tag: string,
): Promise<void> {
  await upsertMeta(driveFileId, (m) => {
    m.tags = m.tags.filter((t) => t !== tag);
  });
}

export async function markViewed(driveFileId: string): Promise<void> {
  await upsertMeta(driveFileId, (m) => {
    m.lastViewed = new Date().toISOString();
  });
}

/** Rename a tag everywhere it appears (tag list + every file). */
export async function renameTag(from: string, to: string): Promise<void> {
  const target = to.trim();
  if (!target || from === target) return;
  await db.transaction('rw', db.tags, db.fileMeta, async () => {
    await db.tags.delete(from);
    await ensureTagInTx(target);
    const affected = await db.fileMeta
      .filter((m) => m.tags.includes(from))
      .toArray();
    for (const m of affected) {
      m.tags = Array.from(new Set(m.tags.map((t) => (t === from ? target : t))));
      m.updatedAt = Date.now();
      await db.fileMeta.put(m);
    }
  });
  scheduleSync();
}

async function ensureTagInTx(name: string): Promise<void> {
  const existing = await db.tags.get(name);
  if (!existing) await db.tags.put({ name, color: pickColor(name) });
}
