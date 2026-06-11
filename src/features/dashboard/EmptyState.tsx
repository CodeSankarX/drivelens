import { Button } from '@/components/ui/Button';
import { FolderIcon, RefreshIcon, StarIcon, TagIcon } from '@/components/ui/Icon';
import type { SidebarView } from '@/types';

function content(view: SidebarView) {
  if (view.kind === 'smart' && view.id === 'favorites') {
    return {
      icon: <StarIcon size={26} />,
      title: 'No favorites yet',
      body: 'Hover any file and tap the star, or press “f” while it’s focused.',
    };
  }
  if (view.kind === 'tag') {
    return {
      icon: <TagIcon size={26} />,
      title: `Nothing tagged “${view.tag}”`,
      body: 'Add this tag to files from any card or the preview panel.',
    };
  }
  if (view.kind === 'category') {
    return {
      icon: <FolderIcon size={26} />,
      title: 'No files in this category',
      body: 'Try a different category or refresh from Drive.',
    };
  }
  return {
    icon: <FolderIcon size={26} />,
    title: 'No files found',
    body: 'Your Drive looks empty here, or it hasn’t finished syncing.',
  };
}

export function EmptyState({
  view,
  hasSync,
  onRefresh,
}: {
  view: SidebarView;
  hasSync: boolean;
  onRefresh: () => void;
}) {
  const { icon, title, body } = content(view);
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-bg-muted text-content-tertiary">
        {icon}
      </div>
      <h3 className="text-base font-medium">{title}</h3>
      <p className="mt-1 max-w-xs text-sm text-content-tertiary">{body}</p>
      {hasSync && (
        <Button variant="secondary" size="sm" className="mt-5" onClick={onRefresh}>
          <RefreshIcon size={15} /> Refresh from Drive
        </Button>
      )}
    </div>
  );
}
