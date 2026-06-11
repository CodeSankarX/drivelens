import { useCallback, useEffect, useState } from 'react';
import {
  isSignedIn as isSignedInFn,
  onAuthChange,
  signIn as signInFn,
  signOut as signOutFn,
} from '@/lib/google/auth';

export interface AuthApi {
  signedIn: boolean;
  signingIn: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => void;
}

/** React binding around the in-memory GIS token client. */
export function useAuth(): AuthApi {
  const [signedIn, setSignedIn] = useState(isSignedInFn());
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => onAuthChange(setSignedIn), []);

  const signIn = useCallback(async () => {
    setSigningIn(true);
    setError(null);
    try {
      await signInFn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed.');
    } finally {
      setSigningIn(false);
    }
  }, []);

  const signOut = useCallback(() => {
    signOutFn();
  }, []);

  return { signedIn, signingIn, error, signIn, signOut };
}
