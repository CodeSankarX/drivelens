import { listAllFiles, type ListProgress } from '@/lib/google/drive';
import { db } from './dexie';

/**
 * Pull all Drive file metadata and reconcile it into the local cache.
 * Rows no longer present in Drive are pruned so the dashboard stays accurate.
 */
export async function syncDriveFiles(
  onProgress?: (p: ListProgress) => void,
  signal?: AbortSignal,
): Promise<number> {
  const files = await listAllFiles(onProgress, signal);
  const liveIds = new Set(files.map((f) => f.id));

  await db.transaction('rw', db.driveFiles, async () => {
    await db.driveFiles.bulkPut(files);
    const existing = await db.driveFiles.toCollection().primaryKeys();
    const stale = existing.filter((id) => !liveIds.has(id as string));
    if (stale.length) await db.driveFiles.bulkDelete(stale as string[]);
  });

  return files.length;
}
