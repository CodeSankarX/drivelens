import { APPDATA_FILENAME } from '@/lib/config';
import { categorize } from '@/lib/mime';
import type { DriveFile } from '@/types';
import { getValidAccessToken, signIn } from './auth';

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3';

/** Raw subset of Drive's file resource we request. */
interface RawDriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  createdTime?: string;
  size?: string;
  thumbnailLink?: string;
  iconLink?: string;
  webViewLink?: string;
  starred?: boolean;
}

interface FileListResponse {
  files: RawDriveFile[];
  nextPageToken?: string;
}

/**
 * Authorized fetch against the Drive API. Retries once after an interactive
 * sign-in when the server responds 401 (expired/invalid token).
 */
async function driveFetch(
  input: string,
  init: RequestInit = {},
  retry = true,
): Promise<Response> {
  const token = await getValidAccessToken();
  const res = await fetch(input, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  });
  if (res.status === 401 && retry) {
    // Token rejected — force interactive re-auth then retry once.
    await signIn();
    return driveFetch(input, init, false);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `Drive API ${res.status} ${res.statusText}${text ? `: ${text}` : ''}`,
    );
  }
  return res;
}

const FILE_FIELDS =
  'id,name,mimeType,modifiedTime,createdTime,size,thumbnailLink,iconLink,webViewLink,starred';

function toDriveFile(raw: RawDriveFile): DriveFile {
  return {
    id: raw.id,
    name: raw.name,
    mimeType: raw.mimeType,
    modifiedTime: raw.modifiedTime,
    createdTime: raw.createdTime,
    size: raw.size != null ? Number(raw.size) : undefined,
    thumbnailLink: raw.thumbnailLink,
    iconLink: raw.iconLink,
    webViewLink: raw.webViewLink,
    starred: raw.starred,
    category: categorize(raw.mimeType),
    cachedAt: Date.now(),
  };
}

export interface ListProgress {
  /** Files fetched so far. */
  count: number;
}

/**
 * List the user's Drive files, paging through all results.
 * Folders and trashed files are excluded.
 */
export async function listAllFiles(
  onProgress?: (p: ListProgress) => void,
  signal?: AbortSignal,
): Promise<DriveFile[]> {
  const out: DriveFile[] = [];
  let pageToken: string | undefined;

  do {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const params = new URLSearchParams({
      q: "trashed = false and mimeType != 'application/vnd.google-apps.folder'",
      fields: `nextPageToken, files(${FILE_FIELDS})`,
      pageSize: '100',
      orderBy: 'modifiedTime desc',
      spaces: 'drive',
      corpora: 'user',
    });
    if (pageToken) params.set('pageToken', pageToken);

    const res = await driveFetch(`${DRIVE_API}/files?${params}`, { signal });
    const data = (await res.json()) as FileListResponse;
    for (const raw of data.files ?? []) out.push(toDriveFile(raw));
    onProgress?.({ count: out.length });
    pageToken = data.nextPageToken;
  } while (pageToken);

  return out;
}

/** Fetch raw file bytes (for image/text/markdown previews). */
export async function downloadFileBlob(fileId: string): Promise<Blob> {
  const res = await driveFetch(
    `${DRIVE_API}/files/${fileId}?alt=media`,
  );
  return res.blob();
}

/** Fetch a file's textual content (text / markdown previews). */
export async function downloadFileText(fileId: string): Promise<string> {
  const res = await driveFetch(`${DRIVE_API}/files/${fileId}?alt=media`);
  return res.text();
}

/** Export a Google-native doc to a given mimeType (e.g. text/plain). */
export async function exportFileText(
  fileId: string,
  mimeType: string,
): Promise<string> {
  const res = await driveFetch(
    `${DRIVE_API}/files/${fileId}/export?mimeType=${encodeURIComponent(
      mimeType,
    )}`,
  );
  return res.text();
}

/**
 * Fetch a thumbnail as an object URL using an authorized request.
 * `thumbnailLink` URLs require the Authorization header to load reliably.
 */
export async function fetchAuthorizedObjectUrl(url: string): Promise<string> {
  const res = await driveFetch(url);
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

/* ------------------------------------------------------------------ */
/* appDataFolder (hidden per-app storage) for cross-device metadata.  */
/* ------------------------------------------------------------------ */

/** Find the existing metadata blob's fileId in appDataFolder, if any. */
export async function findAppDataFile(): Promise<string | null> {
  const params = new URLSearchParams({
    spaces: 'appDataFolder',
    q: `name = '${APPDATA_FILENAME}' and trashed = false`,
    fields: 'files(id,name,modifiedTime)',
    pageSize: '1',
  });
  const res = await driveFetch(`${DRIVE_API}/files?${params}`);
  const data = (await res.json()) as FileListResponse;
  return data.files?.[0]?.id ?? null;
}

/** Read and parse the appDataFolder JSON blob. */
export async function readAppDataFile<T>(fileId: string): Promise<T> {
  const res = await driveFetch(`${DRIVE_API}/files/${fileId}?alt=media`);
  return (await res.json()) as T;
}

/**
 * Create the metadata blob in appDataFolder via multipart upload.
 * Returns the new fileId.
 */
export async function createAppDataFile(payload: unknown): Promise<string> {
  const boundary = `drivelens-${Math.random().toString(36).slice(2)}`;
  const metadata = {
    name: APPDATA_FILENAME,
    parents: ['appDataFolder'],
    mimeType: 'application/json',
  };
  const body =
    `--${boundary}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    'Content-Type: application/json\r\n\r\n' +
    `${JSON.stringify(payload)}\r\n` +
    `--${boundary}--`;

  const res = await driveFetch(
    `${DRIVE_UPLOAD}/files?uploadType=multipart&fields=id`,
    {
      method: 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body,
    },
  );
  const data = (await res.json()) as { id: string };
  return data.id;
}

/** Overwrite an existing appDataFolder blob's contents. */
export async function updateAppDataFile(
  fileId: string,
  payload: unknown,
): Promise<void> {
  await driveFetch(
    `${DRIVE_UPLOAD}/files/${fileId}?uploadType=media`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
}
