import { useCallback, useEffect, useRef, useState } from 'react';
import { ensureDefaults } from '@/lib/db/dexie';
import { syncDriveFiles } from '@/lib/db/driveSync';
import { flushSync, pullAndMerge } from '@/lib/db/sync';
import { useUIStore } from '@/store/uiStore';

interface SyncStatus {
  /** Initial bootstrap (appData merge + first Drive pull) completed. */
  ready: boolean;
  filesFetched: number;
  refresh: () => void;
}

/**
 * Orchestrates startup sync once the user is signed in:
 *   1. ensure local defaults exist,
 *   2. pull + merge appDataFolder metadata,
 *   3. fetch Drive file list into the cache.
 * Also flushes pending metadata writes when the tab is hidden.
 */
export function useDriveSync(signedIn: boolean): SyncStatus {
  const [ready, setReady] = useState(false);
  const [filesFetched, setFilesFetched] = useState(0);
  const setSyncing = useUIStore((s) => s.setSyncing);
  const setSyncError = useUIStore((s) => s.setSyncError);
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(
    async (isInitial: boolean) => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setSyncing(true);
      setSyncError(null);
      try {
        await ensureDefaults();
        if (isInitial) {
          // Metadata first so favorites/tags are present as files arrive.
          try {
            await pullAndMerge();
          } catch (e) {
            console.warn('appData merge failed (continuing):', e);
          }
        }
        const count = await syncDriveFiles(
          (p) => setFilesFetched(p.count),
          ac.signal,
        );
        setFilesFetched(count);
      } catch (e) {
        if ((e as Error)?.name !== 'AbortError') {
          setSyncError(
            e instanceof Error ? e.message : 'Failed to sync with Drive.',
          );
        }
      } finally {
        if (abortRef.current === ac) {
          setSyncing(false);
          setReady(true);
        }
      }
    },
    [setSyncing, setSyncError],
  );

  useEffect(() => {
    if (!signedIn) {
      setReady(false);
      setFilesFetched(0);
      return;
    }
    void run(true);
    return () => abortRef.current?.abort();
  }, [signedIn, run]);

  // Flush pending metadata edits when the page is hidden/closed.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') void flushSync();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
    };
  }, []);

  const refresh = useCallback(() => void run(false), [run]);

  return { ready, filesFetched, refresh };
}
