import type { FileCategory } from '@/types';

/** Map a Drive mimeType to a coarse DriveLens category. */
export function categorize(mimeType: string): FileCategory {
  if (!mimeType) return 'other';

  // Google-native types.
  switch (mimeType) {
    case 'application/vnd.google-apps.folder':
      return 'folder';
    case 'application/vnd.google-apps.document':
      return 'document';
    case 'application/vnd.google-apps.spreadsheet':
      return 'spreadsheet';
    case 'application/vnd.google-apps.presentation':
      return 'presentation';
    case 'application/pdf':
      return 'pdf';
  }

  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('text/')) return 'document';

  if (
    /(zip|x-7z-compressed|x-rar|x-tar|gzip|x-gzip|x-bzip2)/.test(mimeType)
  ) {
    return 'archive';
  }

  if (
    /(msword|wordprocessingml|opendocument\.text|rtf)/.test(mimeType)
  ) {
    return 'document';
  }
  if (/(ms-excel|spreadsheetml|opendocument\.spreadsheet)/.test(mimeType)) {
    return 'spreadsheet';
  }
  if (
    /(ms-powerpoint|presentationml|opendocument\.presentation)/.test(mimeType)
  ) {
    return 'presentation';
  }

  return 'other';
}

/** Whether a file can be previewed inline by DriveLens. */
export function isPreviewable(category: FileCategory): boolean {
  return (
    category === 'image' ||
    category === 'pdf' ||
    category === 'document' ||
    category === 'presentation' ||
    category === 'spreadsheet'
  );
}

/** True for Google-native docs that need export rather than direct download. */
export function isGoogleNative(mimeType: string): boolean {
  return mimeType.startsWith('application/vnd.google-apps');
}

const CATEGORY_LABELS: Record<FileCategory, string> = {
  document: 'Documents',
  image: 'Images',
  video: 'Videos',
  audio: 'Audio',
  pdf: 'PDFs',
  archive: 'Archives',
  spreadsheet: 'Spreadsheets',
  presentation: 'Presentations',
  folder: 'Folders',
  other: 'Other',
};

export function categoryLabel(category: FileCategory): string {
  return CATEGORY_LABELS[category];
}

/** Human-readable file size. */
export function formatSize(bytes?: number): string {
  if (bytes == null || Number.isNaN(bytes)) return '—';
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

/** Relative-ish date label for cards. */
export function formatDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const now = Date.now();
  const diff = now - d.getTime();
  const day = 86_400_000;
  if (diff < day && d.getDate() === new Date().getDate()) {
    return d.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
  }
  if (diff < 7 * day) {
    return d.toLocaleDateString(undefined, { weekday: 'short' });
  }
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  });
}
