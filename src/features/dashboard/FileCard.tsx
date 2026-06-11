import { memo, useRef, useState } from 'react';
import { CategoryIcon, StarIcon, TagIcon } from '@/components/ui/Icon';
import { TagChip } from '@/components/ui/TagChip';
import { TagPopover } from '@/features/tags/TagPopover';
import { useToggleFavorite } from '@/hooks/useFavorites';
import { formatDate, formatSize } from '@/lib/mime';
import { cn } from '@/lib/cn';
import type { MergedFile } from '@/types';

interface FileCardProps {
  file: MergedFile;
  focused: boolean;
  tagColors: Map<string, string>;
  onOpen: (file: MergedFile) => void;
  onFocus: (id: string) => void;
}

function FileCardImpl({
  file,
  focused,
  tagColors,
  onOpen,
  onFocus,
}: FileCardProps) {
  const toggleFavorite = useToggleFavorite();
  const [tagOpen, setTagOpen] = useState(false);
  const [thumbFailed, setThumbFailed] = useState(false);
  const tagBtnRef = useRef<HTMLButtonElement>(null);

  const showThumb = !!file.thumbnailLink && !thumbFailed;

  return (
    <div
      role="button"
      tabIndex={0}
      data-file-id={file.id}
      aria-label={file.name}
      onClick={() => onOpen(file)}
      onMouseEnter={() => onFocus(file.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onOpen(file);
        }
      }}
      className={cn(
        'group relative flex cursor-pointer flex-col rounded-xl border bg-bg-subtle p-3 text-left transition-colors',
        focused
          ? 'border-accent shadow-glow'
          : 'border-border-subtle hover:border-border hover:bg-bg-muted',
      )}
    >
      {/* Favorite toggle */}
      <button
        type="button"
        aria-label={file.favorite ? 'Remove favorite' : 'Add favorite'}
        aria-pressed={file.favorite}
        onClick={(e) => {
          e.stopPropagation();
          toggleFavorite(file.id);
        }}
        className={cn(
          'absolute right-2 top-2 z-10 rounded-md p-1 transition-colors',
          file.favorite
            ? 'text-star'
            : 'text-content-tertiary opacity-0 hover:text-star group-hover:opacity-100 focus-visible:opacity-100',
        )}
      >
        <StarIcon size={17} filled={file.favorite} />
      </button>

      {/* Thumbnail / icon */}
      <div className="mb-3 flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-lg bg-bg-base">
        {showThumb ? (
          <img
            src={file.thumbnailLink}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setThumbFailed(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <CategoryIcon
            category={file.category}
            size={34}
            className="text-content-tertiary"
          />
        )}
      </div>

      {/* Name + meta */}
      <div className="flex items-start gap-2">
        <CategoryIcon
          category={file.category}
          size={15}
          className="mt-0.5 shrink-0 text-content-tertiary"
        />
        <p className="line-clamp-2 flex-1 text-sm font-medium leading-tight text-content-primary">
          {file.name}
        </p>
      </div>
      <p className="mt-1 text-2xs text-content-tertiary">
        {formatDate(file.modifiedTime)}
        {file.size != null && ` · ${formatSize(file.size)}`}
      </p>

      {/* Tags + add button */}
      <div className="mt-2 flex flex-wrap items-center gap-1">
        {file.tags.slice(0, 3).map((t) => (
          <TagChip key={t} name={t} color={tagColors.get(t)} />
        ))}
        {file.tags.length > 3 && (
          <span className="text-2xs text-content-tertiary">
            +{file.tags.length - 3}
          </span>
        )}
        <button
          ref={tagBtnRef}
          type="button"
          aria-label="Edit tags"
          onClick={(e) => {
            e.stopPropagation();
            setTagOpen((v) => !v);
          }}
          className={cn(
            'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-2xs text-content-tertiary transition-opacity hover:bg-bg-raised hover:text-content-secondary',
            file.tags.length === 0
              ? ''
              : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
          )}
        >
          <TagIcon size={12} />
          {file.tags.length === 0 && 'Tag'}
        </button>
      </div>

      {tagOpen && (
        <TagPopover
          driveFileId={file.id}
          currentTags={file.tags}
          anchor={tagBtnRef.current}
          onClose={() => setTagOpen(false)}
        />
      )}
    </div>
  );
}

export const FileCard = memo(FileCardImpl);
