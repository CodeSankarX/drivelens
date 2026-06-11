import {
  createAppDataFile,
  findAppDataFile,
  readAppDataFile,
  updateAppDataFile,
} from '@/lib/google/drive';
import type { AppDataPayload, Collection, FileMeta, Tag } from '@/types';
import { SYNC_STATE_ID, db, getSyncState } from './dexie';

/**
 * Bridges local IndexedDB user metadata with the durable copy in Drive's
 * hidden appDataFolder. Strategy: last-write-wins, evaluated per file by
 * `updatedAt`, and per payload-revision for tags/collections.
 */

/** Build the payload representing current local state. */
async function buildPayload(revision: number): Promise<AppDataPayload> {
  const [metas, tags, collections] = await Promise.all([
    db.fileMeta.toArray(),
    db.tags.toArray(),
    db.collections.toArray(),
  ]);
  const fileMeta: AppDataPayload['fileMeta'] = {};
  for (const m of metas) {
    // Skip empty records to keep the blob lean.
    if (m.tags.length === 0 && !m.favorite && !m.lastViewed) continue;
    fileMeta[m.driveFileId] = {
      tags: m.tags,
      favorite: m.favorite,
      lastViewed: m.lastViewed,
      updatedAt: m.updatedAt,
    };
  }
  return {
    version: 1,
    revision,
    updatedAt: Date.now(),
    fileMeta,
    tags,
    collections,
  };
}

/** Merge a remote payload into local Dexie using last-write-wins. */
async function mergeRemoteIntoLocal(
  remote: AppDataPayload,
): Promise<{ localChanged: boolean }> {
  let localChanged = false;

  await db.transaction(
    'rw',
    db.fileMeta,
    db.tags,
    db.collections,
    async () => {
      // Per-file last-write-wins.
      for (const [driveFileId, r] of Object.entries(remote.fileMeta ?? {})) {
        const local = await db.fileMeta.get(driveFileId);
        if (!local || (r.updatedAt ?? 0) > local.updatedAt) {
          const merged: FileMeta = {
            driveFileId,
            tags: r.tags ?? [],
            favorite: !!r.favorite,
            lastViewed: r.lastViewed,
            updatedAt: r.updatedAt ?? Date.now(),
          };
          await db.fileMeta.put(merged);
        } else if (local.updatedAt > (r.updatedAt ?? 0)) {
          localChanged = true; // local is newer; remote needs our value
        }
      }

      // Tags: union by name. Remote definitions win on color when present.
      const localTags = await db.tags.toArray();
      const tagMap = new Map<string, Tag>(localTags.map((t) => [t.name, t]));
      for (const t of remote.tags ?? []) tagMap.set(t.name, t);
      await db.tags.bulkPut([...tagMap.values()]);

      // Collections: union by id, remote wins on conflict (post-MVP UI).
      const localCols = await db.collections.toArray();
      const colMap = new Map<string, Collection>(
        localCols.map((c) => [c.id, c]),
      );
      for (const c of remote.collections ?? []) colMap.set(c.id, c);
      await db.collections.bulkPut([...colMap.values()]);
    },
  );

  return { localChanged };
}

/**
 * Initial sync on startup: pull remote, merge, then push the converged state
 * so all devices end up consistent. Safe to call once per session start.
 */
export async function pullAndMerge(): Promise<void> {
  const remoteFileId = await findAppDataFile();
  const local = await getSyncState();

  if (!remoteFileId) {
    // First run on this account: seed the remote blob from local state.
    const payload = await buildPayload(local.revision + 1);
    const id = await createAppDataFile(payload);
    await db.syncState.update(SYNC_STATE_ID, {
      remoteFileId: id,
      revision: payload.revision,
      lastSyncedAt: Date.now(),
    });
    return;
  }

  const remote = await readAppDataFile<AppDataPayload>(remoteFileId);
  const { localChanged } = await mergeRemoteIntoLocal(remote);

  const nextRevision = Math.max(local.revision, remote.revision ?? 0) + 1;

  if (localChanged) {
    // We had newer per-file data; push the merged result back.
    const payload = await buildPayload(nextRevision);
    await updateAppDataFile(remoteFileId, payload);
  }

  await db.syncState.update(SYNC_STATE_ID, {
    remoteFileId,
    revision: localChanged ? nextRevision : remote.revision ?? local.revision,
    lastSyncedAt: Date.now(),
  });
}

/** Push current local state to the remote blob, creating it if needed. */
export async function pushNow(): Promise<void> {
  const state = await getSyncState();
  const revision = state.revision + 1;
  const payload = await buildPayload(revision);

  let remoteFileId = state.remoteFileId;
  if (!remoteFileId) {
    remoteFileId = (await findAppDataFile()) ?? undefined;
  }

  if (remoteFileId) {
    await updateAppDataFile(remoteFileId, payload);
  } else {
    remoteFileId = await createAppDataFile(payload);
  }

  await db.syncState.update(SYNC_STATE_ID, {
    remoteFileId,
    revision,
    lastSyncedAt: Date.now(),
  });
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let pending = false;

/**
 * Debounced save: coalesces rapid local edits into a single upload.
 * Failures are swallowed (local remains source of truth until next attempt).
 */
export function scheduleSync(delayMs = 1500): void {
  pending = true;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    saveTimer = null;
    pending = false;
    try {
      await pushNow();
    } catch (err) {
      // Keep local authoritative; a later edit will retry.
      console.warn('DriveLens appData sync failed:', err);
    }
  }, delayMs);
}

/** Flush any pending debounced save immediately (e.g. on page hide). */
export async function flushSync(): Promise<void> {
  if (!pending) return;
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  pending = false;
  try {
    await pushNow();
  } catch (err) {
    console.warn('DriveLens appData flush failed:', err);
  }
}
