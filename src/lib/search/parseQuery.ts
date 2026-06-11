import type { FileCategory } from '@/types';

/**
 * A structured query parsed from raw palette text.
 * Supports `tag:foo`, `type:image`, quoted `tag:"two words"`, and free text.
 */
export interface ParsedQuery {
  tags: string[];
  types: FileCategory[];
  /** Remaining free-text terms, joined with spaces. */
  text: string;
  /** True when the query has no filters and no text. */
  isEmpty: boolean;
}

const TYPE_ALIASES: Record<string, FileCategory> = {
  doc: 'document',
  docs: 'document',
  document: 'document',
  documents: 'document',
  text: 'document',
  img: 'image',
  image: 'image',
  images: 'image',
  photo: 'image',
  photos: 'image',
  pic: 'image',
  video: 'video',
  videos: 'video',
  movie: 'video',
  audio: 'audio',
  music: 'audio',
  sound: 'audio',
  pdf: 'pdf',
  pdfs: 'pdf',
  archive: 'archive',
  archives: 'archive',
  zip: 'archive',
  sheet: 'spreadsheet',
  sheets: 'spreadsheet',
  spreadsheet: 'spreadsheet',
  excel: 'spreadsheet',
  slide: 'presentation',
  slides: 'presentation',
  presentation: 'presentation',
  deck: 'presentation',
  folder: 'folder',
  other: 'other',
};

/**
 * Tokenize respecting double quotes so `tag:"my tag"` stays intact.
 */
function tokenize(input: string): string[] {
  const tokens: string[] = [];
  const re = /"([^"]*)"|(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(input)) !== null) {
    tokens.push(m[1] !== undefined ? m[1] : m[2]);
  }
  return tokens;
}

export function parseQuery(raw: string): ParsedQuery {
  const tags: string[] = [];
  const types: FileCategory[] = [];
  const textParts: string[] = [];

  // Handle prefixed values that may themselves be quoted, e.g. tag:"a b".
  const re = /(tag|type):"([^"]*)"|(tag|type):(\S+)|"([^"]*)"|(\S+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    const prefix = (m[1] || m[3])?.toLowerCase();
    const prefixedValue = m[2] ?? m[4];
    if (prefix && prefixedValue != null) {
      const value = prefixedValue.trim().toLowerCase();
      if (!value) continue;
      if (prefix === 'tag') {
        if (!tags.includes(value)) tags.push(value);
      } else {
        const cat = TYPE_ALIASES[value];
        if (cat && !types.includes(cat)) types.push(cat);
      }
      continue;
    }
    const free = m[5] ?? m[6];
    if (free) textParts.push(free);
  }

  const text = textParts.join(' ').trim();
  return {
    tags,
    types,
    text,
    isEmpty: tags.length === 0 && types.length === 0 && text.length === 0,
  };
}

// Re-export for callers that only need the tokenizer (kept for testability).
export { tokenize };
