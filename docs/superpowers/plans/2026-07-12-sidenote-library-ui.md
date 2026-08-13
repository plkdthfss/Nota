# SideNote Library UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current editor side panel with a responsive, accessible SideNote library UI supporting static default and search states.

**Architecture:** Keep the existing WXT root-directory convention. `App.vue` owns only local display state and composes focused library components; typed mock data and global design tokens live in independent modules.

**Tech Stack:** WXT 0.20, Vue 3.5, TypeScript 5.9, CSS, `@lucide/vue`

## Global Constraints

- Support widths from 320px through 520px without horizontal scrolling.
- Use only the supplied static mock data and local Vue state.
- Do not import Tiptap, Pinia, `chrome.storage`, IndexedDB, Tailwind, Bootstrap, or network APIs.
- Use the exact colors, dimensions, typography, radii, and spacing from the approved design specification.
- All icon controls must be native buttons with `aria-label`, `title`, and visible keyboard focus.
- Only the note list may scroll vertically.

---

### Task 1: Design tokens and global layout foundation

**Files:**
- Create: `styles/tokens.css`
- Create: `styles/base.css`
- Create: `styles/library.css`
- Modify: `entrypoints/sidepanel/style.css`

**Interfaces:**
- Produces CSS custom properties named `--color-*`, `--shadow-fab`, and `--radius-*` for every component.
- Produces shared classes for shell, header, search, folders, note list, cards, result header, and FAB.

- [ ] **Step 1: Replace the starter stylesheet imports**

```css
@import '../../styles/tokens.css';
@import '../../styles/base.css';
@import '../../styles/library.css';
```

- [ ] **Step 2: Add the exact token declarations**

```css
:root {
  --color-bg-page: #f7f8fa;
  --color-bg-surface: #ffffff;
  --color-bg-subtle: #f4f4f5;
  --color-text-primary: #18181b;
  --color-text-secondary: #71717a;
  --color-border-default: #e4e4e7;
  --color-action-accent: #635bff;
  --color-action-accent-muted: #f0efff;
  --color-status-success: #16a34a;
  --color-status-danger: #dc2626;
  --shadow-fab: 0 5px 14px rgba(26, 26, 31, 0.2);
  --radius-xs: 5px;
  --radius-sm: 7px;
  --radius-md: 8px;
  --radius-card: 10px;
  --radius-lg: 12px;
  --radius-panel: 14px;
}
```

- [ ] **Step 3: Add global reset and shell layout**

Set `box-sizing: border-box`, remove body margin, apply the approved Inter stack, make `html`, `body`, and `#app` fill the viewport, and set `overflow: hidden`. Define a `100dvh` single-column `.library-shell` with `min-width: 320px` and `min-height: 0`.

- [ ] **Step 4: Add component classes and responsive rules**

Implement exact 52px header, 36px search field, 34px folder rows, 92px minimum note cards, 40px FAB, selected/hover/focus states, text ellipsis, custom narrow scrollbar, and a `@media (max-width: 359px)` rule reducing horizontal content padding to 12px.

- [ ] **Step 5: Compile the CSS entry**

Run: `npm run compile`

Expected: exit code 0 with no Vue or TypeScript errors.

### Task 2: Typed mock library model

**Files:**
- Create: `types/library.ts`
- Create: `mock/noteLibraryMock.ts`

**Interfaces:**
- Produces `Folder`, `NoteListItem`, and `LibraryViewState` interfaces.
- Produces `folders`, `defaultNotes`, `searchResultNotes`, `DEFAULT_FOLDER_ID`, `DEFAULT_NOTE_ID`, and `DEFAULT_SEARCH_NOTE_ID` exports.

- [ ] **Step 1: Define strict interfaces**

```ts
export interface Folder {
  id: string;
  name: string;
  count: number;
  expanded: boolean;
  selected: boolean;
}

export interface NoteListItem {
  id: string;
  title: string;
  excerpt: string;
  folderName: string;
  updatedLabel: string;
  selected: boolean;
}

export type LibraryViewState = 'default' | 'search';
```

- [ ] **Step 2: Add the exact approved mock records**

Create Inbox/5, Projects/8, Learning/12, Archive/24 folders; the four specified default notes; and the three specified Markdown search results. Projects and the first default note start selected; the second search result is the search default.

- [ ] **Step 3: Verify no untyped escape hatches**

Run: `rg -n "\bany\b|as unknown" types mock`

Expected: no matches.

### Task 3: Shared button and header/search controls

**Files:**
- Create: `components/common/IconButton.vue`
- Create: `components/library/AppHeader.vue`
- Create: `components/library/SearchBar.vue`

**Interfaces:**
- `IconButton` consumes `{ label: string; title?: string; size?: 'small' | 'medium' }` and emits native click events.
- `SearchBar` consumes `modelValue: string`, emits `update:modelValue`, `clear`, and `focus-request`.
- `AppHeader` emits `search` when its search control is activated.

- [ ] **Step 1: Implement `IconButton`**

Use a native `<button type="button">`, bind `aria-label` and `title`, render a default slot, and use the shared `.icon-button` classes.

- [ ] **Step 2: Implement `AppHeader`**

Render a 24px purple app mark, flexible SideNote title, and Lucide `Search` plus `MoreHorizontal` inside `IconButton`. The search control emits `search`; the more control has no business action.

- [ ] **Step 3: Implement `SearchBar`**

Render Lucide `Search`, an input with `aria-label="Search notes"` and placeholder `Search notes`, and a conditional Lucide `X` button with `aria-label="Clear search"`. Emit an empty model value followed by `clear` on clear.

- [ ] **Step 4: Compile components**

Run: `npm run compile`

Expected: exit code 0.

### Task 4: Folder and note presentation components

**Files:**
- Create: `components/library/FolderItem.vue`
- Create: `components/library/FolderTree.vue`
- Create: `components/library/NoteListItem.vue`
- Create: `components/library/NoteList.vue`
- Create: `components/library/SearchResultHeader.vue`
- Create: `components/library/NewNoteButton.vue`

**Interfaces:**
- `FolderItem` consumes `folder: Folder` and emits `select(id: string)`.
- `FolderTree` consumes `folders: Folder[]` and emits `select(id: string)`.
- `NoteListItem` consumes `note: NoteListItem` and emits `select(id: string)`.
- `NoteList` consumes `notes: NoteListItem[]` and emits `select(id: string)`.
- `SearchResultHeader` consumes `count: number`.
- `NewNoteButton` emits `create` without mutating data.

- [ ] **Step 1: Implement folder components**

Use Lucide `ChevronDown`/`ChevronRight` and `Folder`. Render each folder as a full-width button with `aria-current` for the selected row and preserve the right-aligned count.

- [ ] **Step 2: Implement note components**

Render each note as a button-like card with `aria-pressed`, a title row with decorative `MoreHorizontal`, a single-line excerpt, and folder/time metadata. Stop propagation from the more icon button.

- [ ] **Step 3: Implement search result header and FAB**

Show `${count} results` and `in all folders`. Use Lucide `Plus` in a fixed-size button labelled `New note`; emit `create` only.

- [ ] **Step 4: Compile components**

Run: `npm run compile`

Expected: exit code 0.

### Task 5: Compose the two library states

**Files:**
- Replace: `entrypoints/sidepanel/App.vue`
- Confirm: `entrypoints/sidepanel/main.ts`

**Interfaces:**
- Consumes all components and mock exports from Tasks 2–4.
- Produces the complete side panel UI with local search, folder selection, note selection, and header-to-input focus behavior.

- [ ] **Step 1: Remove all editor and storage code**

Replace Tiptap imports, storage definitions, save timers, editor lifecycle hooks, toolbar template, and clear-document logic with local `ref`/`computed` state.

- [ ] **Step 2: Compose the shell**

Render `AppHeader`, `SearchBar`, `FolderTree`, conditional `SearchResultHeader`, `NoteList`, and `NewNoteButton` in this order. Keep the note region as the only flexing scroll container.

- [ ] **Step 3: Implement deterministic state switching**

Use `computed(() => searchQuery.value.trim() ? 'search' : 'default')`. On entering search, map the fixed search results and select `DEFAULT_SEARCH_NOTE_ID`; on clear, restore `DEFAULT_NOTE_ID`. Folder and note clicks replace only their local selected IDs.

- [ ] **Step 4: Connect the header search control**

Keep an input ref exposed by `SearchBar` or a focus-request counter prop so clicking the header search icon focuses the real search input without adding new UI.

- [ ] **Step 5: Confirm forbidden imports are absent**

Run: `rg -n "@tiptap|pinia|#imports|storage\." entrypoints/sidepanel components mock types`

Expected: no matches.

### Task 6: Build and visual verification

**Files:**
- Modify only files from Tasks 1–5 if verification finds a defect.

**Interfaces:**
- Produces a compiled Chrome extension and verified side-panel layout.

- [ ] **Step 1: Run static verification**

Run: `npm run compile`

Expected: exit code 0.

- [ ] **Step 2: Run production build**

Run: `npm run build`

Expected: exit code 0 and Chrome MV3 output under `.output/chrome-mv3`.

- [ ] **Step 3: Inspect at 400×900**

Verify 52px header, 36px search field, Projects selected, first default note selected, 92px minimum cards, and FAB 16px from the bottom-right.

- [ ] **Step 4: Inspect default/search interactions**

Enter `markdown`; verify `3 results`, `in all folders`, three fixed results, and the second result selected. Clear search and verify restoration of the default list.

- [ ] **Step 5: Inspect responsive and keyboard states**

At 320×900 and 520×900 verify no horizontal scrollbar, no clipped cards, visible counts/times, text ellipsis, list-only scrolling, and visible focus rings while tabbing through every control.

- [ ] **Step 6: Review the final diff**

Run: `git diff --check` if the repository becomes available; otherwise inspect `rg --files` plus the modified files directly. Confirm no unrelated files changed and no editor/storage implementation remains in the side-panel source.
