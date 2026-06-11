# DriveLens

A fast, organized **lens over your Google Drive**. DriveLens layers tagging,
favorites, fuzzy search, and inline previews on top of Drive — without a backend
and without modifying anything in your Drive. Drive stays the source of truth for
files; your tags and favorites live locally in IndexedDB and sync across devices
through Drive's hidden per-app storage.

> Pure client-side **Vite + React 18 + TypeScript + Tailwind** single-page app.
> No server, no database to run — just static files plus the Google APIs.

---

## What it does

- **Dashboard** — browse Drive files in a responsive card or list grid, grouped
  by smart views (Recent, Favorites, Starred) and by category (Documents,
  Images, Videos, Audio, PDFs, Spreadsheets, Presentations, Archives).
- **Tagging** — add color-coded tags to any file. Filter the sidebar by tag.
  Tags are user metadata and survive Drive re-syncs.
- **Favorites** — star files independently of Drive's own star.
- **Command palette** (`⌘K` / `Ctrl+K`) — fuzzy search with a query mini-language:
  - `tag:design` — files carrying a tag
  - `type:pdf` — files of a category (`doc`, `image`, `video`, `pdf`, `sheet`, `slides`, …)
  - free text — fuzzy-matched against name + tags (via Fuse.js)
  - combine them: `type:image tag:trip sunset`
- **Preview** — inline preview for images, PDFs, Google Docs/Sheets/Slides
  (embedded Drive viewer), and text/markdown (rendered with `react-markdown`),
  plus **Open in Drive** and **Copy link**.
- **Cross-device sync** — your tags/favorites are written to a single
  `drivelens-meta.json` blob in Drive's hidden `appDataFolder`, debounced and
  merged last-write-wins on startup.

### Keyboard shortcuts

| Shortcut         | Action                                  |
| ---------------- | --------------------------------------- |
| `⌘K` / `Ctrl+K`  | Toggle the command palette              |
| `↑ ↓ ← →`        | Move focus across the grid              |
| `Enter`          | Open the focused file's preview         |
| `f`              | Toggle favorite on the focused file     |
| `Esc`            | Close the palette / preview / popover   |

---

## How it works (architecture)

| Concern        | Choice                                                                    |
| -------------- | ------------------------------------------------------------------------- |
| UI             | React 18 + TypeScript + Tailwind                                          |
| Auth           | Google Identity Services (GIS) **token client**, fully client-side        |
| Drive access   | Drive REST API v3 over `fetch`                                            |
| Local store    | IndexedDB via **Dexie** + `useLiveQuery` (reactive, local-first)          |
| Cross-device   | Drive **`appDataFolder`** JSON blob (last-write-wins)                      |
| Ephemeral UI   | **Zustand** (palette open, selected file, sync status)                    |
| Search         | Query parser (`tag:`/`type:`/text) + **Fuse.js** fuzzy match              |

Because the app is backend-less, OAuth uses short-lived **in-memory access
tokens** (~1 hour, no refresh token). DriveLens silently re-requests a token
when one expires and falls back to an interactive prompt if needed. This is the
accepted trade-off of the no-backend design.

### OAuth scopes requested

- `https://www.googleapis.com/auth/drive.readonly` — read file metadata and
  content for the dashboard and previews.
- `https://www.googleapis.com/auth/drive.appdata` — read/write DriveLens's own
  metadata blob in the hidden app folder. This scope **cannot** see the rest of
  your Drive.

---

## Prerequisites

- **Node.js ≥ 18** and npm.
- A **Google account** and access to the [Google Cloud Console](https://console.cloud.google.com/).

---

## Google Cloud Console: OAuth setup

You need an **OAuth Client ID** (Web application). Follow these steps once.

### 1. Create / select a project

1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Click the project picker → **New Project** (or pick an existing one).

### 2. Enable the Google Drive API

1. Go to **APIs & Services → Library**.
2. Search for **Google Drive API** and click **Enable**.

### 3. Configure the OAuth consent screen

1. Go to **APIs & Services → OAuth consent screen**.
2. Choose **External** (unless you're in a Workspace org and want Internal),
   then **Create**.
3. Fill in the required app name, user support email, and developer contact
   email. Save and continue.
4. On **Scopes**, you may add the two scopes below now or leave them — the app
   requests them at sign-in time regardless:
   - `.../auth/drive.readonly`
   - `.../auth/drive.appdata`
5. While the app is in **Testing**, add your own Google account under
   **Test users**. Otherwise sign-in will be blocked.

### 4. Create the OAuth Client ID

1. Go to **APIs & Services → Credentials**.
2. Click **Create Credentials → OAuth client ID**.
3. Application type: **Web application**.
4. Under **Authorized JavaScript origins**, add the origins you'll run the app
   from (no path, no trailing slash):
   - `http://localhost:5173` (Vite dev server, default)
   - `http://localhost:4173` (Vite preview, optional)
   - your production origin, e.g. `https://drivelens.example.com`
5. **Authorized redirect URIs** can be left empty — the GIS token client uses a
   popup/postMessage flow, not redirects.
6. Click **Create** and copy the **Client ID**
   (looks like `1234567890-abc...xyz.apps.googleusercontent.com`).

### 5. (Optional) Create an API key

DriveLens authenticates every Drive call with the OAuth token, so an API key is
**not required**. The `VITE_GOOGLE_API_KEY` slot exists only for future use; you
can leave it blank.

---

## Environment variables

Copy the example file and fill in your client ID:

```bash
cp .env.example .env
```

```dotenv
# .env
VITE_GOOGLE_CLIENT_ID=1234567890-abc...xyz.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=
```

> Vite only exposes variables prefixed with `VITE_` to the client, and you must
> **restart the dev server** after editing `.env`.

If `VITE_GOOGLE_CLIENT_ID` is missing, the app still renders and shows a friendly
setup screen instead of crashing.

---

## Run it

```bash
# install dependencies
npm install

# start the dev server (http://localhost:5173)
npm run dev

# type-check + production build
npm run build

# preview the production build locally
npm run preview

# lint
npm run lint
```

Open the dev URL, click **Continue with Google**, grant the requested
permissions, and your Drive will sync into the dashboard.

---

## Project structure

```
drivelens/
  index.html                     # loads GIS script + app entry
  package.json, vite.config.ts, tailwind.config.ts, tsconfig.json
  .env.example                   # VITE_GOOGLE_CLIENT_ID, VITE_GOOGLE_API_KEY
  src/
    main.tsx, App.tsx, types.ts
    index.css                    # Tailwind layers + design tokens
    lib/
      config.ts                  # env + OAuth constants
      cn.ts, mime.ts             # helpers (classnames, categorization, formatting)
      google/auth.ts             # GIS token client, in-memory token, silent refresh
      google/drive.ts            # files.list (paginated), content/export, appData I/O
      db/dexie.ts                # IndexedDB schema (Dexie)
      db/driveSync.ts            # Drive -> Dexie file cache reconcile
      db/mutations.ts            # optimistic tag/favorite writes
      db/sync.ts                 # appDataFolder load/merge + debounced save
      search/parseQuery.ts       # tag:/type:/free-text parser
    store/uiStore.ts             # Zustand ephemeral UI state
    hooks/                       # useAuth, useDriveSync, useFiles, useTags, useFavorites, useSearch
    features/
      auth/SignIn.tsx
      sidebar/Sidebar.tsx
      dashboard/{Dashboard,FileGrid,FileCard,EmptyState}.tsx
      search/CommandPalette.tsx  # cmdk, ⌘K
      preview/PreviewModal.tsx   # image / pdf / text / markdown
      tags/TagPopover.tsx
    components/ui/               # Button, Modal, Spinner, Skeleton, TagChip, Icon
```

---

## Data model

- **`driveFiles`** (cache of Drive metadata): `id, name, mimeType, modifiedTime,
  size, thumbnailLink, iconLink, webViewLink, starred, category`.
- **`fileMeta`** (user data, keyed by `driveFileId`, survives re-sync):
  `tags[], favorite, lastViewed, updatedAt`.
- **`tags`**: `{ name, color }` · **`collections`**: `{ id, name, fileIds[] }`
  (schema present; collections UI is post-MVP).
- **`prefs`**: view mode + sort · **`syncState`**: `{ lastSyncedAt, revision,
  remoteFileId }`.

The UI merges `driveFiles` + `fileMeta` by id into a single `MergedFile` shape.

---

## Privacy & limitations

- DriveLens runs entirely in your browser. Tokens are held **in memory only** and
  are never persisted; closing the tab signs you out.
- Drive content is **never modified** — DriveLens only reads files and writes its
  own private blob in `appDataFolder`.
- No refresh tokens (backend-less), so expect an occasional re-consent after
  ~1 hour of activity.
- Out of scope for this MVP: smart-collection rules, AI/NL search, graph view,
  and full project workspaces (some schemas are stubbed for later).
