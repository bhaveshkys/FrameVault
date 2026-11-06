# FrameVault — AI-Ready Visual Reference Library for Video Editors

FrameVault is a personal visual reference management system built specifically for video editors, motion designers, and documentary creators. It transforms the tedious manual process of taking screenshots and pasting them onto scattered Figma boards into a streamlined visual research experience.

With FrameVault, you can capture screenshots from YouTube, Vimeo, documentaries, or local files, categorize them across multiple editing techniques, search effortlessly, and synchronize them directly into organized category sections on your Figma boards.

---

## Key Features

1. **High-Speed Quick Capture (⌘V)**:
   - macOS screenshot clipboard paste: press `⌘V` anywhere in the app to immediately preview and capture a frame.
   - Drag & drop image files (PNG, JPG, WebP) directly into the capture station.
   - Automatic aspect-ratio detection for video stills (2.39:1 anamorphic cinemascope, 16:9 widescreen, 4:3 documentary frames, 9:16 vertical reels).
   - Source URL preservation (YouTube, Vimeo, Instagram, etc.).

2. **Multi-Category Reference Architecture**:
   - Seeded with 15 core video editing categories (*Visual Metaphors*, *Maps & Geography*, *Typography*, *Motion Graphics*, *Data Visualization*, *Cinematic Composition*, *Transitions*, *Sound Design*, *Documentary Editing*, *Product Advertising*, *UI & Interface*, *Color Grading*, *Camera Movement*, *Editing Techniques*, *Historical Visuals*).
   - Create, rename, customize section colors, and delete categories without losing underlying references.
   - References support multiple category associations simultaneously.

3. **Editorial Visual Reference Library**:
   - Responsive Masonry grid optimized for media research.
   - Real-time search (`⌘K`) across titles, editing notes, categories, and source links.
   - Multi-category filtering, favorites filter (`/favorites`), Figma sync state filter (*Pending*, *Synced*, *Failed*), and sorting.
   - High-resolution frame viewer with Zoom In (`+`), Zoom Out (`-`), Fit-to-Screen (`0`), 100% 1:1 view, Fullscreen mode, and click-and-drag panning.

4. **Figma Canvas Sync (Plugin API)**:
   - Dedicated Figma Plugin (`apps/figma-plugin`) utilizing official Figma Plugin APIs.
   - Creates or finds a dedicated canvas page: **"FrameVault References"**.
   - Generates organized **Category Sections** for each tag.
   - Auto-layouts cards with screenshot image fills, category badges, titles, clickable source URLs, and editing observations.
   - Duplicate prevention via persistent plugin node metadata (`framevault:sync_key`).
   - Sync retry queue for recovering from connection issues.

---

## Tech Stack

- **Monorepo**: pnpm workspaces
- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Lucide Icons
- **Backend**: Next.js Route Handlers, Zod schema validation
- **Database**: Supabase PostgreSQL with Row Level Security (RLS) & local fallback store
- **Storage**: Supabase Storage (`framevault-references` bucket) & local storage
- **Figma Integration**: Figma Plugin API (Manifest v2, TypeScript, esbuild)

---

## Project Structure

```
framevault/
├── apps/
│   ├── web/                          # Next.js 15 Web Application
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── page.tsx          # Main Visual Reference Library
│   │   │   │   ├── capture/          # Dedicated Capture Station
│   │   │   │   ├── categories/       # Category Management
│   │   │   │   ├── favorites/        # Favorited References
│   │   │   │   ├── figma/            # Figma Sync Status & Instructions
│   │   │   │   ├── settings/         # Settings & API Token Management
│   │   │   │   ├── references/[id]/  # Reference Detail & Inspection Page
│   │   │   │   └── api/              # Route Handlers (CRUD, Figma sync, Upload)
│   │   │   ├── components/           # Masonry cards, image viewer, modals, navbar
│   │   │   └── lib/                  # Database repository, storage, Supabase client
│   │   └── package.json
│   └── figma-plugin/                 # Figma Desktop Plugin
│       ├── manifest.json             # Figma Plugin Manifest
│       ├── src/
│       │   ├── main.ts               # Plugin Sandbox (Section & Card creation)
│       │   └── ui.html               # Plugin UI (Sync Queue, Token Config)
│       ├── build.js                  # esbuild bundler
│       └── package.json
├── supabase/
│   ├── migrations/
│   │   └── 20261106_init.sql         # Tables, RLS policies, triggers, buckets
│   └── seed.sql                      # Seed data script
├── .env.example
├── pnpm-workspace.yaml
└── package.json
```

---

## Quick Start

### 1. Prerequisites
- Node.js 18+ (tested on v22)
- pnpm 9+ (`npm install -g pnpm`)

### 2. Installation
```bash
git clone <repo-url> framevault
cd framevault
pnpm install
```

### 3. Environment Variables
Copy `.env.example` to `.env.local` inside `apps/web`:
```bash
cp .env.example apps/web/.env.local
```

Default variables:
```env
# Optional: Remote Supabase credentials.
# If omitted, FrameVault operates in local development mode out-of-the-box.
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

NEXT_PUBLIC_APP_URL=http://localhost:3000
FRAMEVAULT_API_URL=http://localhost:3000
```

### 4. Running the Web Application
```bash
# Start Next.js dev server on http://localhost:3000
pnpm --filter web dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

---

## Supabase Database & Storage Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com).
2. Go to the **SQL Editor** in your Supabase dashboard.
3. Open `supabase/migrations/20261106_init.sql` and execute the script. It creates:
   - `references` table
   - `categories` table
   - `reference_categories` junction table
   - `figma_sync` status tracking table
   - `api_tokens` table
   - Storage bucket `framevault-references` with RLS policies
   - Automatic triggers to sync categories and seed default editing tags for new users.
4. Copy your **Project URL** and **anon public key** from Supabase Settings → API into `apps/web/.env.local`.

---

## Figma Plugin Installation & Setup

1. Open **Figma Desktop** (macOS or Windows).
2. Build the plugin:
   ```bash
   pnpm --filter figma-plugin build
   ```
3. In Figma, navigate to `Plugins` → `Development` → `Import plugin from manifest...`.
4. Select `apps/figma-plugin/manifest.json`.
5. Open any design board or create a blank Figma document.
6. Run `Plugins` → `Development` → `FrameVault — Visual Reference Sync`.
7. In the plugin window:
   - Go to the **Settings** tab.
   - Verify backend URL: `http://localhost:3000`.
   - Paste your **Personal Access Token** (generated in FrameVault `/settings` or `/figma`).
   - Click **Save Configuration**.
8. Go to the **Sync Engine** tab and click **"Sync All to FrameVault References"**.
9. The plugin will create category sections and position reference cards automatically!

---

## Keyboard Shortcuts

| Shortcut | Description |
|---|---|
| `⌘ + K` / `Ctrl + K` | Global search & quick jump palette |
| `⌘ + Shift + C` | Open quick capture modal from any page |
| `⌘ + V` | Paste screenshot directly from macOS clipboard |
| `+` / `-` | Zoom in / zoom out in high-res frame viewer |
| `0` | Fit frame to screen |
| `Esc` | Close modal / exit fullscreen view |

---

## Production Build & Verification

```bash
# Build both web app and Figma plugin
pnpm build

# Start production server
pnpm --filter web start
```
