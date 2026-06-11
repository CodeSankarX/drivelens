import { useCallback } from 'react';
import { toggleFavorite as toggleFavoriteDb } from '@/lib/db/mutations';

/** Stable callback to toggle a file's favorite state (optimistic). */
export function useToggleFavorite(): (driveFileId: string) => void {
  return useCallback((driveFileId: string) => {
    void toggleFavoriteDb(driveFileId);
  }, []);
}
