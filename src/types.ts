/**
 * Core domain types for DriveLens.
 *
 * Two persistence concerns are kept deliberately separate:
 *  - `DriveFile`  : a cached projection of Google Drive metadata (source of truth = Drive).
 *  - `FileMeta`   : user-authored metadata that must survive re-syncs (source of truth = appDataFolder).
 *
 * The UI works with a `MergedFile`, which joins the two by `id`/`driveFileId`.
 */

/** Broad categories DriveLens buckets files into, derived from mimeType. */
export type FileCategory =
  | 'document'
  | 'image'
  | 'video'
  | 'audio'
  | 'pdf'
  | 'archive'
  | 'spreadsheet'
  | 'presentation'
  | 'folder'
  | 'other';

/** A cached row from Drive's `files.list`. Keyed by Drive's file `id`. */
export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  /** RFC 3339 timestamp. */
  modifiedTime: string;
  /** RFC 3339 timestamp. */
  createdTime?: string;
  /** Size in bytes (Drive returns a string; we store a number when present). */
  size?: number;
  thumbnailLink?: string;
  iconLink?: string;
  webViewLink?: string;
  /** Drive's own star flag (distinct from DriveLens favorites). */
  starred?: boolean;
  /** Derived bucket, computed at sync time for fast filtering. */
  category: FileCategory;
  /** When DriveLens last cached this row locally (epoch ms). */
  cachedAt: number;
}

/** User-authored metadata for a file. Keyed by `driveFileId`. */
export interface FileMeta {
  driveFileId: string;
  tags: string[];
  favorite: boolean;
  /** RFC 3339 timestamp of the last time the user opened a preview. */
  lastViewed?: string;
  /** Epoch ms of the last local mutation; used for last-write-wins merges. */
  updatedAt: number;
}

/** A named tag with a display color. */
export interface Tag {
  name: string;
  color: string;
}

/** Stubbed for post-MVP smart collections; schema present, UI deferred. */
export interface Collection {
  id: string;
  name: string;
  fileIds: string[];
}

export type ViewMode = 'grid' | 'list';

export type SortKey = 'modified' | 'name' | 'size';

/** Singleton preferences row (id = 'prefs'). */
export interface Prefs {
  id: 'prefs';
  viewMode: ViewMode;
  sortKey: SortKey;
  sortDir: 'asc' | 'desc';
}

/** Singleton sync bookkeeping row (id = 'syncState'). */
export interface SyncState {
  id: 'syncState';
  /** Epoch ms of last successful appDataFolder sync. */
  lastSyncedAt: number;
  /** Monotonic revision counter for last-write-wins. */
  revision: number;
  /** Drive fileId of the appDataFolder blob, once known. */
  remoteFileId?: string;
}

/** Drive metadata joined with user metadata; what the UI renders. */
export interface MergedFile extends DriveFile {
  tags: string[];
  favorite: boolean;
  lastViewed?: string;
}

/** The shape persisted to Drive's appDataFolder (`drivelens-meta.json`). */
export interface AppDataPayload {
  version: 1;
  revision: number;
  updatedAt: number;
  fileMeta: Record<string, Omit<FileMeta, 'driveFileId'>>;
  tags: Tag[];
  collections: Collection[];
}

/** Sidebar navigation targets. */
export type SidebarView =
  | { kind: 'smart'; id: 'recent' | 'starred' | 'favorites' | 'all' }
  | { kind: 'category'; id: FileCategory }
  | { kind: 'tag'; tag: string };
