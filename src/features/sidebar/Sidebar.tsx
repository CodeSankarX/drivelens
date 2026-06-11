import { useMemo } from 'react';
import {
  CategoryIcon,
  ClockIcon,
  FolderIcon,
  SparkleIcon,
  StarIcon,
  TagIcon,
} from '@/components/ui/Icon';
import { useCategoryCounts, useFavoriteCount } from '@/hooks/useFiles';
import { useTags } from '@/hooks/useTags';
import { useUIStore } from '@/store/uiStore';
import { categoryLabel } from '@/lib/mime';
import { cn } from '@/lib/cn';
import type { FileCategory, SidebarView } from '@/types';

const CATEGORY_ORDER: FileCategory[] = [
  'document',
  'image',
  'video',
  'audio',
  'pdf',
  'spreadsheet',
  'presentation',
  'archive',
  'other',
];

function NavItem({
  active,
  icon,
  label,
  count,
  color,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  count?: number;
  color?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors',
        active
          ? 'bg-accent-subtle text-content-primary'
          : 'text-content-secondary hover:bg-bg-subtle hover:text-content-primary',
      )}
    >
      <span
        className={cn(
          'shrink-0',
          active ? 'text-accent' : 'text-content-tertiary',
        )}
        style={color ? { color } : undefined}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate text-left">{label}</span>
      {count != null && count > 0 && (
        <span className="text-2xs text-content-tertiary">{count}</span>
      )}
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-2.5 pb-1 pt-4 text-2xs font-medium uppercase tracking-wider text-content-tertiary">
      {children}
    </p>
  );
}

export function Sidebar() {
  const view = useUIStore((s) => s.view);
  const setView = useUIStore((s) => s.setView);
  const counts = useCategoryCounts();
  const favCount = useFavoriteCount();
  const tags = useTags();

  const isActive = useMemo(
    () => (v: SidebarView) => JSON.stringify(v) === JSON.stringify(view),
    [view],
  );

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border-subtle bg-bg-base">
      <div className="flex items-center gap-2 px-4 py-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/15 text-accent">
          <SparkleIcon size={17} />
        </div>
        <span className="text-sm font-semibold tracking-tight">DriveLens</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-4">
        <NavItem
          active={isActive({ kind: 'smart', id: 'recent' })}
          icon={<ClockIcon size={17} />}
          label="Recent"
          onClick={() => setView({ kind: 'smart', id: 'recent' })}
        />
        <NavItem
          active={isActive({ kind: 'smart', id: 'favorites' })}
          icon={<StarIcon size={17} filled={favCount ? favCount > 0 : false} />}
          label="Favorites"
          count={favCount}
          onClick={() => setView({ kind: 'smart', id: 'favorites' })}
        />
        <NavItem
          active={isActive({ kind: 'smart', id: 'starred' })}
          icon={<StarIcon size={17} />}
          label="Starred in Drive"
          onClick={() => setView({ kind: 'smart', id: 'starred' })}
        />
        <NavItem
          active={isActive({ kind: 'smart', id: 'all' })}
          icon={<FolderIcon size={17} />}
          label="All files"
          onClick={() => setView({ kind: 'smart', id: 'all' })}
        />

        <SectionLabel>Categories</SectionLabel>
        {CATEGORY_ORDER.filter((c) => (counts?.[c] ?? 0) > 0).map((c) => (
          <NavItem
            key={c}
            active={isActive({ kind: 'category', id: c })}
            icon={<CategoryIcon category={c} size={17} />}
            label={categoryLabel(c)}
            count={counts?.[c]}
            onClick={() => setView({ kind: 'category', id: c })}
          />
        ))}
        {!counts && (
          <p className="px-2.5 py-1 text-2xs text-content-tertiary">Loading…</p>
        )}

        {tags && tags.length > 0 && (
          <>
            <SectionLabel>Tags</SectionLabel>
            {tags.map((t) => (
              <NavItem
                key={t.name}
                active={isActive({ kind: 'tag', tag: t.name })}
                icon={<TagIcon size={16} />}
                label={t.name}
                color={t.color}
                onClick={() => setView({ kind: 'tag', tag: t.name })}
              />
            ))}
          </>
        )}
      </nav>
    </aside>
  );
}
