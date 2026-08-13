import type { Folder, NoteListItem } from '../types/library';
export const DEFAULT_FOLDER_ID = 'projects';
export const DEFAULT_NOTE_ID = 'sidebar-notes';
export const DEFAULT_SEARCH_NOTE_ID = 'search-sidebar-notes';
export const folders: Folder[] = [
  { id: 'inbox', name: 'Inbox', count: 5, expanded: false, selected: false },
  { id: 'projects', name: 'Projects', count: 8, expanded: true, selected: true },
  { id: 'learning', name: 'Learning', count: 12, expanded: false, selected: false },
  { id: 'archive', name: 'Archive', count: 24, expanded: false, selected: false },
];
export const defaultNotes: NoteListItem[] = [
  { id: 'sidebar-notes', title: 'Chrome sidebar Markdown notes', excerpt: 'Design a focused note-taking flow inside the browser.', folderName: 'Projects', updatedLabel: '2 min ago', selected: true },
  { id: 'launch-checklist', title: 'Project launch checklist', excerpt: 'A compact checklist for the next release milestone.', folderName: 'Projects', updatedLabel: '1 hr ago', selected: false },
  { id: 'graph-attention', title: 'Learning graph attention', excerpt: 'Notes on syntax graphs and contextual representations.', folderName: 'Learning', updatedLabel: 'Yesterday', selected: false },
  { id: 'weekly-review', title: 'Weekly review', excerpt: 'Decisions, blockers, and next actions from this week.', folderName: 'Inbox', updatedLabel: 'Jun 29', selected: false },
];
export const searchResultNotes: NoteListItem[] = [
  { id: 'markdown-shortcuts', title: 'Markdown editing shortcuts', excerpt: 'Common keyboard patterns for faster Markdown writing.', folderName: 'Learning', updatedLabel: 'Today', selected: false },
  { id: 'search-sidebar-notes', title: 'Chrome sidebar Markdown notes', excerpt: 'Design a focused note-taking flow inside the browser.', folderName: 'Projects', updatedLabel: '2 min ago', selected: true },
  { id: 'markdown-export', title: 'Markdown export checklist', excerpt: 'Things to verify before exporting a note to a file.', folderName: 'Projects', updatedLabel: 'Jun 28', selected: false },
];
