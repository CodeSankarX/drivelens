import { DRIVE_SCOPES, GOOGLE_CLIENT_ID } from '@/lib/config';

/**
 * Client-side Google OAuth using Google Identity Services (GIS) token client.
 *
 * Pure no-backend flow: we receive short-lived access tokens (~1h) that live
 * only in memory. There is no refresh token; we re-request silently with
 * `prompt: ''` when a token nears expiry, falling back to a consent prompt.
 */

type TokenResponse = google.accounts.oauth2.TokenResponse;

interface TokenState {
  accessToken: string;
  /** Epoch ms at which the token should be treated as expired. */
  expiresAt: number;
}

let tokenState: TokenState | null = null;
let tokenClient: google.accounts.oauth2.TokenClient | null = null;
const listeners = new Set<(signedIn: boolean) => void>();

/** Resolver/rejecter for the access-token request currently in flight. */
let pendingResolve: ((token: string) => void) | null = null;
let pendingReject: ((err: Error) => void) | null = null;

/** Treat tokens as expired this many ms early to avoid mid-request expiry. */
const EXPIRY_SKEW_MS = 60_000;

function notify(): void {
  const signedIn = isSignedIn();
  listeners.forEach((l) => l(signedIn));
}

/** Subscribe to sign-in state changes. Returns an unsubscribe function. */
export function onAuthChange(cb: (signedIn: boolean) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function isSignedIn(): boolean {
  return !!tokenState && Date.now() < tokenState.expiresAt - EXPIRY_SKEW_MS;
}

export function getAccessTokenSync(): string | null {
  return isSignedIn() ? tokenState!.accessToken : null;
}

/** Wait until the GIS script (`window.google`) has loaded. */
function waitForGis(timeoutMs = 10_000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) return resolve();
    const start = Date.now();
    const timer = setInterval(() => {
      if (window.google?.accounts?.oauth2) {
        clearInterval(timer);
        resolve();
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(timer);
        reject(new Error('Google Identity Services failed to load.'));
      }
    }, 50);
  });
}

async function ensureTokenClient(): Promise<google.accounts.oauth2.TokenClient> {
  if (tokenClient) return tokenClient;
  await waitForGis();
  if (!GOOGLE_CLIENT_ID) {
    throw new Error('VITE_GOOGLE_CLIENT_ID is not configured.');
  }
  // The callback/error_callback are fixed at init and route to whichever
  // request is currently in flight via the module-level resolvers.
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: DRIVE_SCOPES,
    callback: (resp: TokenResponse) => {
      if ((resp as { error?: string }).error) {
        pendingReject?.(
          new Error(
            (resp as { error_description?: string }).error_description ||
              (resp as { error?: string }).error ||
              'Authorization failed.',
          ),
        );
      } else {
        applyToken(resp);
        pendingResolve?.(resp.access_token);
      }
      pendingResolve = null;
      pendingReject = null;
    },
    error_callback: (err: { type?: string; message?: string }) => {
      pendingReject?.(
        new Error(err?.message || err?.type || 'Authorization failed.'),
      );
      pendingResolve = null;
      pendingReject = null;
    },
  });
  return tokenClient;
}

function applyToken(resp: TokenResponse): void {
  const expiresInSec = Number(resp.expires_in ?? 3600);
  tokenState = {
    accessToken: resp.access_token,
    expiresAt: Date.now() + expiresInSec * 1000,
  };
  notify();
}

/**
 * Request an access token.
 * @param interactive when true, shows the consent/account chooser if needed.
 */
function requestToken(interactive: boolean): Promise<string> {
  return new Promise((resolve, reject) => {
    void (async () => {
      try {
        const client = await ensureTokenClient();
        // Reject any prior in-flight request before taking over the handlers.
        pendingReject?.(new Error('Superseded by a newer token request.'));
        pendingResolve = resolve;
        pendingReject = reject;
        client.requestAccessToken({ prompt: interactive ? 'consent' : '' });
      } catch (err) {
        pendingResolve = null;
        pendingReject = null;
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    })();
  });
}

/** Interactive sign-in (shows Google consent UI as needed). */
export async function signIn(): Promise<void> {
  await requestToken(true);
}

/** Drop the in-memory token and revoke it with Google. */
export function signOut(): void {
  const token = tokenState?.accessToken;
  tokenState = null;
  notify();
  if (token && window.google?.accounts?.oauth2) {
    try {
      window.google.accounts.oauth2.revoke(token, () => {});
    } catch {
      /* best-effort */
    }
  }
}

let inFlight: Promise<string> | null = null;

/**
 * Return a valid access token, silently refreshing if expired. Throws if a
 * silent refresh is not possible (caller should prompt interactive sign-in).
 */
export async function getValidAccessToken(): Promise<string> {
  if (isSignedIn()) return tokenState!.accessToken;
  if (inFlight) return inFlight;
  inFlight = requestToken(false).finally(() => {
    inFlight = null;
  });
  return inFlight;
}
