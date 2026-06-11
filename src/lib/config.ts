/** Centralized access to build-time configuration and OAuth constants. */

export const GOOGLE_CLIENT_ID = (
  import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''
).trim();

export const GOOGLE_API_KEY = (
  import.meta.env.VITE_GOOGLE_API_KEY ?? ''
).trim();

/** OAuth scopes required by DriveLens. */
export const DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.appdata',
].join(' ');

/** True when the app has the minimum config needed to attempt sign-in. */
export const isConfigured = (): boolean => GOOGLE_CLIENT_ID.length > 0;

/** Name of the metadata blob stored in Drive's hidden appDataFolder. */
export const APPDATA_FILENAME = 'drivelens-meta.json';
