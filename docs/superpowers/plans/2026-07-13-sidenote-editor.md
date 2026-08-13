# SideNote Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a responsive, non-persistent Tiptap editor view to the existing SideNote library.

**Architecture:** `App.vue` switches between library and editor without routing. `NoteEditor` mounts a fresh editor from typed Mock data each time, while focused child components own navigation, formatting controls, menus, and status rendering.

**Tech Stack:** WXT 0.20, Vue 3.5, TypeScript 5.9, Tiptap 3.27, Lucide Vue, CSS

## Global Constraints

- Preserve the existing library UI and its local search/selection behavior.
- Reset editor title and document from Mock data on every entry.
- Do not use storage, autosave, Pinia, IndexedDB, network APIs, routing, or Markdown serialization.
- Support 320–520px widths; only the editor body may scroll.
- Do not use `any`; all buttons require accessible names and visible keyboard focus.

---

### Task 1: Editor model, Mock document, tokens, and layout

**Files:**
- Create: `types/editor.ts`
- Create: `mock/editorMock.ts`
- Create: `styles/editor.css`
- Modify: `styles/tokens.css`
- Modify: `entrypoints/sidepanel/style.css`

**Interfaces:**
- Produce `EditorNoteMock { title: string; path: string; content: string }`.
- Produce `editorMock: EditorNoteMock` containing the exact approved HTML structure.
- Produce editor layout classes and Tiptap prose styles.

- [ ] Add `--color-bg-floating: #27272a` and `--shadow-floating: 0 6px 18px rgba(24, 24, 27, 0.16)` to the existing token file.
- [ ] Define `EditorNoteMock` without optional fields or `any`.
- [ ] Add the approved title, path, paragraphs, task list, blockquote, H2, and example link to `editorMock.ts`.
- [ ] Implement `editor.css`: five grid rows `48px 86px 40px minmax(0, 1fr) 32px`, body-only scrolling, prose typography, tasks, quote, code, links, selection, menus, and 320/360/400px padding breakpoints.
- [ ] Import `editor.css` after `library.css` in `entrypoints/sidepanel/style.css`.
- [ ] Run `npm run compile`; expect exit code 0.

### Task 2: Tiptap editor lifecycle

**Files:**
- Create: `composables/useTiptapEditor.ts`

**Interfaces:**
- Consume `initialContent: string`.
- Produce `{ editor, wordCount }`, where `editor` is Tiptap's Vue editor ref and `wordCount` is a Vue computed number.

- [ ] Create the editor with StarterKit, Link configured with `openOnClick: false`, TaskList, nested TaskItem, and CharacterCount.
- [ ] Set editor attributes `aria-label="Note content"`, `spellcheck="true"`, and class `sidenote-prose`.
- [ ] Compute words from `editor.storage.characterCount.words()` and return 0 before editor creation.
- [ ] Keep all lifecycle destruction inside `useEditor`; do not add storage hooks or update persistence.
- [ ] Run `npm run compile`; expect exit code 0.

### Task 3: Editor shell components

**Files:**
- Create: `components/editor/EditorHeader.vue`
- Create: `components/editor/EditorTitleBlock.vue`
- Create: `components/editor/EditorStatusBar.vue`
- Create: `components/editor/NoteEditor.vue`

**Interfaces:**
- `EditorHeader` consumes `path: string`, emits `back`.
- `EditorTitleBlock` consumes `modelValue: string`, emits `update:modelValue`.
- `EditorStatusBar` consumes `wordCount: number`.
- `NoteEditor` emits `back` and owns a fresh local title/editor instance.

- [ ] Build the 48px header with ArrowLeft, ellipsized path, and MoreHorizontal; keep the More action visual only.
- [ ] Build the title input with `aria-label="Note title"`, local `v-model`, title typography, and `Editing` metadata.
- [ ] Build the 32px status bar showing `${wordCount} words` and `Editing`.
- [ ] Compose the five regions in `NoteEditor`; render `EditorContent` inside the independently scrolling fourth row.
- [ ] Run `npm run compile`; expect exit code 0.

### Task 4: Fixed toolbar and popup menus

**Files:**
- Create: `components/editor/ToolbarButton.vue`
- Create: `components/editor/HeadingMenu.vue`
- Create: `components/editor/LinkPopover.vue`
- Create: `components/editor/MoreFormatMenu.vue`
- Create: `components/editor/FixedToolbar.vue`

**Interfaces:**
- All components consume `editor: Editor`.
- `ToolbarButton` consumes `label`, `active`, and `disabled`; emits `activate` while preventing mousedown selection loss.
- Menu components emit `close`; `LinkPopover` receives the selected URL and applies/removes links.

- [ ] Implement the reusable 30×30 toolbar button with `aria-label`, `title`, `aria-pressed`, disabled, and `@mousedown.prevent`.
- [ ] Implement Heading options using `setParagraph` and `toggleHeading({ level: 1|2|3 })`, with active rows.
- [ ] Implement Link URL input, Apply, and Remove; restore the saved `{ from, to }` selection before link commands.
- [ ] Implement More commands: Strike, Inline Code, Code Block, Ordered List, Horizontal Rule, Undo, Redo; derive active/disabled states from the editor.
- [ ] Implement fixed button order Bold, Italic, Heading, Bullet List, Blockquote, Link, spacer, More. Add Task List access to More or the compact overflow while retaining every required command.
- [ ] Ensure only one popup opens, Escape and outside click close it, and commands restore focus.
- [ ] Run `npm run compile`; expect exit code 0.

### Task 5: Selection BubbleMenu

**Files:**
- Create: `components/editor/SelectionToolbar.vue`
- Modify: `components/editor/NoteEditor.vue`

**Interfaces:**
- Consume `editor: Editor`.
- Render the official Tiptap Vue BubbleMenu only for non-empty text selections outside code blocks.

- [ ] Use the Tiptap 3 Vue BubbleMenu package/API matching installed dependencies.
- [ ] Configure the visibility predicate from editor focus, selection bounds, and `editor.isActive('codeBlock')`.
- [ ] Add Bold, Italic, Link, Inline Code, and Blockquote in the approved order, retaining the original selection.
- [ ] Reuse the link popover behavior or a shared callback without duplicating link command semantics.
- [ ] Style the 38px dark floating menu and constrain it to the side-panel viewport.
- [ ] Run `npm run compile`; expect exit code 0.

### Task 6: Library/editor switching

**Files:**
- Modify: `components/library/NoteList.vue`
- Modify: `entrypoints/sidepanel/App.vue`

**Interfaces:**
- `NoteList` continues emitting `select(id)`.
- `App.vue` adds `currentPage: 'library' | 'editor'`; selection sets editor view, editor back sets library view.

- [ ] Keep the complete existing library template in a conditional library branch.
- [ ] On any note selection, preserve the current library selection behavior and set `currentPage = 'editor'`.
- [ ] Mount `<NoteEditor v-else @back="currentPage = 'library'" />`; do not use `v-show`, so leaving destroys the editor.
- [ ] Verify the search focus fix `.search-input:focus-visible { outline: none; }` remains present.
- [ ] Run `rg -n "storage|chrome\.storage|pinia|IndexedDB" components/editor composables mock/editorMock.ts entrypoints/sidepanel/App.vue`; expect no matches.
- [ ] Run `npm run compile`; expect exit code 0.

### Task 7: Functional and responsive verification

**Files:**
- Modify only files above if verification exposes a defect.

**Interfaces:**
- Produce a buildable Chrome MV3 extension with verified editor behavior.

- [ ] Run `npm run compile`; expect exit code 0.
- [ ] Run `npm run build`; expect exit code 0 and `.output/chrome-mv3/sidepanel.html`.
- [ ] At 400×900 verify 48/86/40/flexible/32px rows and body-only scrolling.
- [ ] Verify entry, return, and re-entry reset behavior.
- [ ] Verify title/body input, all format commands, active states, TaskList checkbox, word count, Undo/Redo disabled state, link apply/remove, popup Escape/outside close, and BubbleMenu appearance/disappearance.
- [ ] At 320×900 and 520×900 verify no horizontal scroll, no two-column transformation, no toolbar wrap, no clipped body, and menus inside the viewport.
- [ ] Inspect final source for forbidden persistence APIs and unrelated library UI changes.
