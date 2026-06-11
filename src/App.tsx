import { Suspense, lazy, useEffect } from 'react';
import { SignIn } from '@/features/auth/SignIn';
import { Sidebar } from '@/features/sidebar/Sidebar';
import { Dashboard } from '@/features/dashboard/Dashboard';
import { useAuth } from '@/hooks/useAuth';
import { useDriveSync } from '@/hooks/useDriveSync';
import { useUIStore } from '@/store/uiStore';

// Code-split the heavier surfaces (cmdk, react-markdown) so they load on demand.
const CommandPalette = lazy(() =>
  import('@/features/search/CommandPalette').then((m) => ({
    default: m.CommandPalette,
  })),
);
const PreviewModal = lazy(() =>
  import('@/features/preview/PreviewModal').then((m) => ({
    default: m.PreviewModal,
  })),
);

export default function App() {
  const auth = useAuth();
  const { ready, filesFetched, refresh } = useDriveSync(auth.signedIn);

  // Global Cmd/Ctrl+K to toggle the command palette.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const s = useUIStore.getState();
        s.setPaletteOpen(!s.paletteOpen);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!auth.signedIn) {
    return <SignIn auth={auth} />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-bg-base">
      <Sidebar />
      <Dashboard
        ready={ready}
        filesFetched={filesFetched}
        onRefresh={refresh}
        auth={auth}
      />
      <Suspense fallback={null}>
        <CommandPalette />
        <PreviewModal />
      </Suspense>
    </div>
  );
}
