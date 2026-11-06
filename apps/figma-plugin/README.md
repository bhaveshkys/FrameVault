# FrameVault Figma Plugin

Official Figma Plugin for **FrameVault** — An AI-ready visual reference library for video editors, motion designers, and documentary creators.

## Overview

The FrameVault Figma Plugin synchronizes your captured video screenshots, documentary stills, and visual references directly into your Figma workspace:
- Creates a dedicated page: **"FrameVault References"**
- Automatically organizes cards into clearly labeled **Category Sections** (e.g. *Cinematic Composition*, *Transitions*, *Typography*, *Motion Graphics*, *Sound Design*, etc.)
- Embeds the original high-resolution screenshot with correct aspect ratio
- Adds title, category badges, source link (with active Figma hyperlink), and editing notes
- Prevents duplicates using persistent node metadata (`framevault:sync_key`)
- Reports synchronized Figma node IDs back to FrameVault backend

## Requirements
- Figma Desktop App (macOS or Windows)
- FrameVault Web App running locally (`http://localhost:3000`) or in production

## How to Install and Run

1. Open **Figma Desktop**.
2. Go to the menu: `Plugins` → `Development` → `Import plugin from manifest...`
3. Browse to this directory and select `apps/figma-plugin/manifest.json`.
4. Open your project file / design board in Figma.
5. Press `Plugins` → `Development` → `FrameVault — Visual Reference Sync`.
6. In the plugin window:
   - Click the **Settings** tab.
   - Enter your FrameVault URL (defaults to `http://localhost:3000`).
   - Enter your **Personal Sync Token** (copied from FrameVault `/settings` or `/figma`).
   - Click **Save Configuration**.
7. Click the **Sync Engine** tab.
8. Click **"Sync All to FrameVault References"**.
9. The plugin will create category sections and position cards in an organized visual grid!

## Building from Source

```bash
# In apps/figma-plugin
pnpm build

# Or watch mode during development
pnpm watch
```

