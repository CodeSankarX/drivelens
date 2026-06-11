import { FileCard } from './FileCard';
import type { MergedFile } from '@/types';

interface FileGridProps {
  files: MergedFile[];
  focusedId: string | null;
  tagColors: Map<string, string>;
  onOpen: (file: MergedFile) => void;
  onFocus: (id: string) => void;
}

export function FileGrid({
  files,
  focusedId,
  tagColors,
  onOpen,
  onFocus,
}: FileGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {files.map((file) => (
        <FileCard
          key={file.id}
          file={file}
          focused={focusedId === file.id}
          tagColors={tagColors}
          onOpen={onOpen}
          onFocus={onFocus}
        />
      ))}
    </div>
  );
}
