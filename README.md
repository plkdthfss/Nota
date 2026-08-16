# SideNote — Chrome Side Panel Notes Extension

<p align="center">
  <a href="./README.ch.md">简体中文</a> | <b>English</b>
</p>

A note-taking extension for the Chrome **Side Panel**, built with **WXT + Vue 3 + Tiptap**. Click the extension icon to take notes, organize folders, and search full text right in the browser sidebar. All data is stored locally in `chrome.storage.local` — no server, fully offline.

## ✨ Features

- **Note library**: folder management, note list (filtered by folder), full-library search (title/excerpt + full-text scan)
- **Rich-text editor**: built on Tiptap — headings (H1–H3), bold/italic, ordered/unordered/task lists, blockquotes, inline code/code blocks, links, horizontal rules, undo/redo; Markdown-compatible documents under the hood
- **Auto-save**: 800ms debounced writes merged into one, forced flush before navigating back / panel hide — no lost keystrokes
- **Note management**: create in the current folder, delete (with confirmation), **export as a standalone `.md` file** (Save As dialog)
- **Folder management**: create; on delete choose the **cascade policy** — move notes to any existing folder, or delete notes along with the folder (empty folders delete directly without confirmation)
- **Light / dark theme**: one-click toggle, the editor switches in sync, preference persisted locally
- **Local-first data**: everything stored in `chrome.storage.local` (`unlimitedStorage` granted), no accounts, no cloud sync, privacy-friendly

## 🧱 Tech Stack

| Layer | Choice |
| --- | --- |
| Extension framework | [WXT](https://wxt.dev) 0.20 (Chrome MV3) + Vite |
| UI | Vue 3.5 (`<script setup lang="ts">`, TS strict) + [@lucide/vue](https://lucide.dev) icons |
| Editor | [Tiptap](https://tiptap.dev) 3.27 (starter-kit / link / task-list / character-count / markdown) |
| Storage | `chrome.storage.local` (no local database) |
| State management | Centralized in the `App.vue` container (Pinia installed, reserved for future) |

## 📁 Project Structure

```
├── entrypoints/               # WXT extension entries
│   ├── background.ts          # Side panel behavior (open on icon click)
│   ├── content.ts             # Content script (placeholder, matches google.com)
│   └── sidepanel/             # Side panel UI (Vue app)
│       ├── main.ts            # App mounting
│       └── App.vue            # Single state container (library ↔ editor flow)
├── components/
│   ├── library/               # Library components (header/search/folders/list/create)
│   ├── editor/                # Editor components (toolbars/bubble menu/link popover/status bar)
│   └── common/                # Shared components (IconButton, etc.)
├── composables/
│   └── useTiptapEditor.ts     # Editor instance + word count
├── services/                  # Data service layer (reads/writes chrome.storage.local)
│   ├── storage.ts             # Storage adapter (debounced writes/batch reads/error mapping)
│   ├── noteService.ts         # Note CRUD / index maintenance / idempotent init
│   ├── folderService.ts       # Folder CRUD / delete cascade
│   ├── searchService.ts       # Title/excerpt + batched full-text scan
│   ├── settingsService.ts     # Settings (default folder / theme)
│   └── markdownService.ts     # Tiptap HTML ↔ Markdown conversion
├── types/                     # Domain types + storage models + message protocol
│   ├── library.ts             # Frontend view types (Folder / NoteListItem)
│   ├── editor.ts              # Editor types (SidePanelPage, etc.)
│   └── storage.ts             # Persistence models (Meta / Folder / Note index)
├── styles/                    # Design tokens + global styles (token-driven themes)
│   ├── tokens.css             # Design tokens (light/dark CSS variables)
│   ├── base.css / library.css / editor.css
├── mock/                      # Mock data from the early UI prototype (deprecated, removable)
├── docs/                      # Design & API documentation (in Chinese)
│   ├── frontend-api.md        # Frontend API docs (component Props/Emits)
│   ├── backend-design.md      # Backend (data service layer) design
│   └── backend-design-review.md  # Design self-review & risk list
└── wxt.config.ts              # WXT config (manifest / permissions)
```

## 🚀 Quick Start

Requirements: Node.js 18+, Chrome browser (114+ recommended).

```bash
# 1. Install dependencies (postinstall runs `wxt prepare` automatically)
npm install

# 2. Dev mode: opens Chrome with the extension loaded, hot reload
npm run dev

# 3. Production build: output to .output/chrome-mv3
npm run build
```

**Load the built extension manually**:

1. Open `chrome://extensions` and enable "Developer mode" (top-right)
2. Click "Load unpacked" and select `项目目录/.output/chrome-mv3`
3. Click the extension icon in the toolbar to open the SideNote side panel

**Package for publishing**:

```bash
npm run zip        # generates a zip for the Chrome Web Store (.output/*.zip)
```

## 🎯 Usage

| Entry | Function |
| --- | --- |
| Extension icon | Open / close the side panel |
| Search box | Full-library search (includes body); empty shows current folder notes |
| Folder list | Click to filter notes of that folder; row-end ⋮ → delete folder |
| ＋ button (bottom-right) | Upward menu: new note (current folder) / new folder |
| Note card ⋮ | Delete (with confirmation) / Export markdown (.md file) |
| Editor top | Back to library, fixed toolbar (headings/bold/lists/quote/link/more) |
| Selected text | Floating bubble toolbar (bold/italic/link/inline code/quote) |
| ☀/🌙 (top-right) | Toggle light/dark theme |

## 💾 Data & Permissions

All data lives in `chrome.storage.local`:

```
meta           —— schema version + settings (default folder / theme)
folders        —— folder table
notes:index    —— lightweight note index (lists/search, no body)
note:{id}      —— full note body (Tiptap HTML)
```

Extension permissions (`wxt.config.ts` / manifest):

| Permission | Purpose |
| --- | --- |
| `storage` | Note data persistence |
| `unlimitedStorage` | Remove the 10MB default quota of `storage.local` |
| `downloads` | Export notes as `.md` files (Save As dialog) |
| `sidePanel` | Side panel UI |

> Uninstalling the extension clears all data; `chrome.storage` is plaintext — do not store passwords/keys or other sensitive data.

## 🏗 Architecture Overview

```
sidepanel (Vue UI) ──direct calls──▶ services/* (stateless pure functions + Promise)
                                        │
                            chrome.storage.local (only persistence layer)
```

- **Frontend**: `App.vue` is the single state container; leaf components communicate only via Props/Emits, easy to test and swap
- **Service layer**: decoupled from UI, reusable by sidepanel / background / future content scripts (message-routing protocol ready, see backend-design.md)
- **Storage**: index and body separated, per-note atomic writes, debounced autosave batching — avoids storage write-rate limits
- **Theme**: all colors come from CSS variables in `tokens.css`; flipping `<html data-theme>` switches the whole UI (including the editor) instantly

## 🛠 Dev Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Dev mode (Chrome), extension auto-loaded |
| `npm run dev:firefox` | Dev mode (Firefox) |
| `npm run build` | Production build (`.output/chrome-mv3`) |
| `npm run build:firefox` | Production build (Firefox) |
| `npm run compile` | `vue-tsc --noEmit` type check |
| `npm run zip` | Package zip |
| `npm run zip:firefox` | Package zip (Firefox) |

## 📚 Documentation

> The docs under `docs/` are currently written in Chinese.

- [Frontend API](./docs/frontend-api.md) — component Props/Emits, types, page state flow
- [Backend Design](./docs/backend-design.md) — service APIs, storage schema, message protocol, autosave strategy
- [Design Review & Risks](./docs/backend-design-review.md) — known edge cases and pre-release checklist

## 🛠 Customization

- **Extension name / description**: edit `manifest.name` / `manifest.description` in `wxt.config.ts` (currently template placeholders `wxt-tiptap` / `nothing`)
- **Content script match scope**: `matches` in `entrypoints/content.ts` (currently a placeholder matching `*://*.google.com/*`)
- **Design tokens**: adjust the light/dark CSS variables in `styles/tokens.css` to re-skin the whole app

## ⚠️ Known Limitations

- Full-text search scan has a candidate cap (200 notes); notes beyond that may be missed
- Editor undo/redo is session-scoped (reopening a note after autosave can't undo to before the previous session)
- No recycle bin / recovery; destructive actions always require confirmation

## 📄 License

Private project (`"private": true` in `package.json`) — for personal / internal team use.
