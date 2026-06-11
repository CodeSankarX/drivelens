import Dexie, { type Table } from 'dexie';
import type {
  Collection,
  DriveFile,
  FileMeta,
  Prefs,
  SyncState,
  Tag,
} from '@/types';

/**
 * Local-first IndexedDB store.
 *
 * `driveFiles` is a disposable cache rebuilt from Drive; `fileMeta`, `tags`, and
 * `collections` are user data mirrored to/from the appDataFolder blob.
 */
export class DriveLensDB extends Dexie {
  driveFiles!: Table<DriveFile, string>;
  fileMeta!: Table<FileMeta, string>;
  tags!: Table<Tag, string>;
  collections!: Table<Collection, string>;
  prefs!: Table<Prefs, string>;
  syncState!: Table<SyncState, string>;

  constructor() {
    super('drivelens');
    this.version(1).stores({
      // Indexes chosen for the sidebar filters and sorts the UI needs.
      driveFiles: 'id, name, category, modifiedTime, starred, cachedAt',
      fileMeta: 'driveFileId, favorite, updatedAt',
      tags: 'name',
      collections: 'id, name',
      prefs: 'id',
      syncState: 'id',
    });
  }
}

export const db = new DriveLensDB();

export const PREFS_ID = 'prefs' as const;
export const SYNC_STATE_ID = 'syncState' as const;

const DEFAULT_PREFS: Prefs = {
  id: PREFS_ID,
  viewMode: 'grid',
  sortKey: 'modified',
  sortDir: 'desc',
};

const DEFAULT_SYNC_STATE: SyncState = {
  id: SYNC_STATE_ID,
  lastSyncedAt: 0,
  revision: 0,
};

/** Ensure singleton rows exist; safe to call repeatedly. */
export async function ensureDefaults(): Promise<void> {
  await db.transaction('rw', db.prefs, db.syncState, async () => {
    if (!(await db.prefs.get(PREFS_ID))) await db.prefs.put(DEFAULT_PREFS);
    if (!(await db.syncState.get(SYNC_STATE_ID)))
      await db.syncState.put(DEFAULT_SYNC_STATE);
  });
}

export async function getPrefs(): Promise<Prefs> {
  return (await db.prefs.get(PREFS_ID)) ?? DEFAULT_PREFS;
}

export async function getSyncState(): Promise<SyncState> {
  return (await db.syncState.get(SYNC_STATE_ID)) ?? DEFAULT_SYNC_STATE;
}

/**
 * Read user metadata for one file, creating an empty record lazily.
 * Returns the in-memory default without writing if none exists yet.
 */
export async function getFileMeta(driveFileId: string): Promise<FileMeta> {
  return (
    (await db.fileMeta.get(driveFileId)) ?? {
      driveFileId,
      tags: [],
      favorite: false,
      updatedAt: 0,
    }
  );
}
