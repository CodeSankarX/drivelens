import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { SparkleIcon } from '@/components/ui/Icon';
import { isConfigured } from '@/lib/config';
import type { AuthApi } from '@/hooks/useAuth';

const FEATURES = [
  'Tag and organize files without touching Drive itself',
  'Star favorites and filter by type, tag, or recency',
  'Fuzzy command palette search with Cmd + K',
  'Preview images, PDFs, text, and markdown inline',
];

/** Full-screen gate shown until the user signs in (or while unconfigured). */
export function SignIn({ auth }: { auth: AuthApi }) {
  const configured = isConfigured();

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-base p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 text-accent">
            <SparkleIcon size={28} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">DriveLens</h1>
          <p className="mt-1.5 max-w-xs text-sm text-content-secondary">
            A faster, organized lens over your Google Drive. Your tags and
            favorites sync across devices — Drive stays the source of truth.
          </p>
        </div>

        <ul className="mb-8 space-y-2.5">
          {FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-sm">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              <span className="text-content-secondary">{f}</span>
            </li>
          ))}
        </ul>

        {configured ? (
          <>
            <Button
              variant="primary"
              size="md"
              className="w-full justify-center"
              disabled={auth.signingIn}
              onClick={() => void auth.signIn()}
            >
              {auth.signingIn ? (
                <>
                  <Spinner size={16} /> Connecting…
                </>
              ) : (
                'Continue with Google'
              )}
            </Button>
            {auth.error && (
              <p className="mt-3 text-center text-sm text-danger">
                {auth.error}
              </p>
            )}
            <p className="mt-4 text-center text-2xs text-content-tertiary">
              DriveLens requests read-only Drive access plus its own private app
              storage. Nothing in your Drive is modified.
            </p>
          </>
        ) : (
          <SetupNotice />
        )}
      </div>
    </div>
  );
}

/** Shown when env vars are missing so the app renders gracefully. */
function SetupNotice() {
  return (
    <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 text-sm">
      <p className="mb-2 font-medium text-warning">Setup required</p>
      <p className="text-content-secondary">
        No Google client ID is configured. Create a{' '}
        <code className="rounded bg-bg-overlay px-1 py-0.5 text-2xs">.env</code>{' '}
        file in the project root (copy{' '}
        <code className="rounded bg-bg-overlay px-1 py-0.5 text-2xs">
          .env.example
        </code>
        ) and set:
      </p>
      <pre className="mt-3 overflow-x-auto rounded-lg bg-bg-base p-3 text-2xs text-content-secondary">
        {`VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com`}
      </pre>
      <p className="mt-3 text-content-tertiary">
        Then restart the dev server. See the README for full Google Cloud
        Console OAuth setup steps.
      </p>
    </div>
  );
}
