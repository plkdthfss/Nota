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
export type LibraryViewState = "default" | "search";
