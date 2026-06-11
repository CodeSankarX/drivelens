import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { TagChip } from '@/components/ui/TagChip';
import { TagPopover } from '@/features/tags/TagPopover';
import {
  CategoryIcon,
  CloseIcon,
  ExternalIcon,
  LinkIcon,
  StarIcon,
  TagIcon,
} from '@/components/ui/Icon';
import {
  downloadFileBlob,
  downloadFileText,
  exportFileText,
} from '@/lib/google/drive';
import { markViewed, toggleFavorite } from '@/lib/db/mutations';
import { useTagColors } from '@/hooks/useTags';
import { useMergedFiles } from '@/hooks/useFiles';
import { useUIStore } from '@/store/uiStore';
import { formatDate, formatSize, isGoogleNative } from '@/lib/mime';
import type { MergedFile } from '@/types';

const TEXT_EXT = /\.(txt|md|markdown|json|csv|log|ya?ml|xml|ini|tsv)$/i;
const MARKDOWN_EXT = /\.(md|markdown)$/i;

function isTextMime(mime: string, name: string): boolean {
  return mime.startsWith('text/') || TEXT_EXT.test(name) || mime === 'application/json';
}

function drivePreviewUrl(file: MergedFile): string {
  return `https://drive.google.com/file/d/${file.id}/preview`;
}

export function PreviewModal() {
  // Subscribe to live data so the modal reflects tag/favorite edits instantly.
  const previewFile = useUIStore((s) => s.previewFile);
  const setPreviewFile = useUIStore((s) => s.setPreviewFile);
  const merged = useMergedFiles();
  const tagColors = useTagColors();

  const file =
    previewFile && merged
      ? merged.find((f) => f.id === previewFile.id) ?? previewFile
      : previewFile;

  const [tagOpen, setTagOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const tagBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (previewFile) void markViewed(previewFile.id);
  }, [previewFile]);

  if (!file) return null;

  const close = () => {
    setTagOpen(false);
    setPreviewFile(null);
  };

  const copyLink = async () => {
    const link = file.webViewLink ?? drivePreviewUrl(file);
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be blocked; ignore */
    }
  };

  return (
    <Modal
      open
      onClose={close}
      className="flex max-h-[88vh] max-w-4xl flex-col"
      labelledBy="preview-title"
    >
      <header className="flex items-center gap-3 border-b border-border-subtle px-4 py-3">
        <CategoryIcon
          category={file.category}
          size={18}
          className="shrink-0 text-content-tertiary"
        />
        <div className="min-w-0 flex-1">
          <h2 id="preview-title" className="truncate text-sm font-semibold">
            {file.name}
          </h2>
          <p className="text-2xs text-content-tertiary">
            {formatDate(file.modifiedTime)}
            {file.size != null && ` · ${formatSize(file.size)}`}
          </p>
        </div>

        <Button
          variant="ghost"
          size="icon"
          aria-label={file.favorite ? 'Remove favorite' : 'Add favorite'}
          onClick={() => void toggleFavorite(file.id)}
          className={file.favorite ? 'text-star' : ''}
        >
          <StarIcon size={18} filled={file.favorite} />
        </Button>
        <Button
          ref={tagBtnRef}
          variant="ghost"
          size="icon"
          aria-label="Edit tags"
          onClick={() => setTagOpen((v) => !v)}
        >
          <TagIcon size={18} />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Copy link" onClick={copyLink}>
          <LinkIcon size={17} />
        </Button>
        {file.webViewLink && (
          <a href={file.webViewLink} target="_blank" rel="noreferrer">
            <Button variant="ghost" size="icon" aria-label="Open in Drive">
              <ExternalIcon size={17} />
            </Button>
          </a>
        )}
        <Button variant="ghost" size="icon" aria-label="Close" onClick={close}>
          <CloseIcon size={18} />
        </Button>
      </header>

      {(file.tags.length > 0 || copied) && (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border-subtle px-4 py-2">
          {file.tags.map((t) => (
            <TagChip key={t} name={t} color={tagColors.get(t)} />
          ))}
          {copied && (
            <span className="ml-auto text-2xs text-success">Link copied</span>
          )}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-auto bg-bg-base">
        <PreviewContent file={file} />
      </div>

      {tagOpen && (
        <TagPopover
          driveFileId={file.id}
          currentTags={file.tags}
          anchor={tagBtnRef.current}
          onClose={() => setTagOpen(false)}
        />
      )}
    </Modal>
  );
}

/* ---- content loaders per type ------------------------------------- */

function PreviewContent({ file }: { file: MergedFile }) {
  if (file.category === 'image') return <ImagePreview file={file} />;
  if (
    file.category === 'pdf' ||
    file.category === 'presentation' ||
    file.category === 'spreadsheet' ||
    isGoogleNative(file.mimeType)
  ) {
    return <IframePreview file={file} />;
  }
  if (isTextMime(file.mimeType, file.name) || file.category === 'document') {
    return <TextPreview file={file} />;
  }
  return <Unsupported file={file} />;
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-72 items-center justify-center px-6 text-center text-sm text-content-tertiary">
      {children}
    </div>
  );
}

function ImagePreview({ file }: { file: MergedFile }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let revoke: string | null = null;
    let active = true;
    setUrl(null);
    setError(null);
    downloadFileBlob(file.id)
      .then((blob) => {
        if (!active) return;
        revoke = URL.createObjectURL(blob);
        setUrl(revoke);
      })
      .catch((e) => active && setError(e instanceof Error ? e.message : 'Failed to load image.'));
    return () => {
      active = false;
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [file.id]);

  if (error) return <CenteredMessage>{error}</CenteredMessage>;
  if (!url)
    return (
      <CenteredMessage>
        <Spinner />
      </CenteredMessage>
    );
  return (
    <div className="flex items-center justify-center p-4">
      <img
        src={url}
        alt={file.name}
        className="max-h-[70vh] max-w-full rounded-lg object-contain"
      />
    </div>
  );
}

function IframePreview({ file }: { file: MergedFile }) {
  return (
    <iframe
      title={file.name}
      src={drivePreviewUrl(file)}
      className="h-[72vh] w-full border-0 bg-white"
      allow="autoplay"
    />
  );
}

function TextPreview({ file }: { file: MergedFile }) {
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isMarkdown = MARKDOWN_EXT.test(file.name);

  useEffect(() => {
    let active = true;
    setText(null);
    setError(null);
    const loader = isGoogleNative(file.mimeType)
      ? exportFileText(file.id, 'text/plain')
      : downloadFileText(file.id);
    loader
      .then((t) => active && setText(t))
      .catch(
        (e) =>
          active &&
          setError(e instanceof Error ? e.message : 'Failed to load file.'),
      );
    return () => {
      active = false;
    };
  }, [file.id, file.mimeType]);

  if (error) return <CenteredMessage>{error}</CenteredMessage>;
  if (text == null)
    return (
      <CenteredMessage>
        <Spinner />
      </CenteredMessage>
    );

  if (isMarkdown) {
    return (
      <div className="prose-drivelens mx-auto max-w-3xl px-6 py-6">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
      </div>
    );
  }
  return (
    <pre className="whitespace-pre-wrap break-words px-6 py-6 font-mono text-2xs leading-relaxed text-content-secondary">
      {text}
    </pre>
  );
}

function Unsupported({ file }: { file: MergedFile }) {
  return (
    <CenteredMessage>
      <div>
        <p className="mb-3 text-content-secondary">
          No inline preview for this file type.
        </p>
        {file.webViewLink && (
          <a href={file.webViewLink} target="_blank" rel="noreferrer">
            <Button variant="secondary" size="sm">
              <ExternalIcon size={15} /> Open in Drive
            </Button>
          </a>
        )}
      </div>
    </CenteredMessage>
  );
}
