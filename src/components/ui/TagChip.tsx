import { cn } from '@/lib/cn';
import { CloseIcon } from './Icon';

interface TagChipProps {
  name: string;
  color?: string;
  onRemove?: () => void;
  onClick?: () => void;
  className?: string;
}

export function TagChip({
  name,
  color = '#6366f1',
  onRemove,
  onClick,
  className,
}: TagChipProps) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1 rounded-md px-1.5 py-0.5 text-2xs font-medium',
        onClick && 'cursor-pointer hover:brightness-110',
        className,
      )}
      style={{
        backgroundColor: `${color}22`,
        color,
        border: `1px solid ${color}44`,
      }}
      onClick={onClick}
    >
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="truncate">{name}</span>
      {onRemove && (
        <button
          type="button"
          aria-label={`Remove tag ${name}`}
          className="-mr-0.5 ml-0.5 rounded hover:bg-black/20"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <CloseIcon size={11} />
        </button>
      )}
    </span>
  );
}
