/**
 * 文件夹服务 —— 文件夹 CRUD 与删除级联
 * （docs/backend-design.md §3.2 / §5.5）
 *
 * 约定：删除默认文件夹会被拒绝（VALIDATION），避免 defaultFolderId 悬空。
 */

import {
  FOLDERS_KEY,
  META_KEY,
  NOTES_INDEX_KEY,
  noteContentKey,
  StorageError,
  type FolderRecord,
  type MetaRecord,
  type NoteIndexEntry,
} from '../types/storage';
import * as storage from './storage';
import { ensureInitialized } from './noteService';

export async function listFolders(): Promise<FolderRecord[]> {
  await ensureInitialized();
  return (await storage.getItem<FolderRecord[]>(FOLDERS_KEY)) ?? [];
}

export async function createFolder(name: string): Promise<FolderRecord> {
  const trimmed = name.trim();
  if (!trimmed) throw new StorageError('VALIDATION', 'Folder name cannot be empty');
  await ensureInitialized();
  const folders = (await storage.getItem<FolderRecord[]>(FOLDERS_KEY)) ?? [];
  const now = Date.now();
  const folder: FolderRecord = {
    id: crypto.randomUUID(),
    name: trimmed,
    createdAt: now,
    updatedAt: now,
  };
  await storage.setItem(FOLDERS_KEY, [...folders, folder]);
  return folder;
}

export async function renameFolder(id: string, name: string): Promise<FolderRecord> {
  const trimmed = name.trim();
  if (!trimmed) throw new StorageError('VALIDATION', 'Folder name cannot be empty');
  await ensureInitialized();
  const folders = (await storage.getItem<FolderRecord[]>(FOLDERS_KEY)) ?? [];
  const index = folders.findIndex((f) => f.id === id);
  if (index === -1) throw new StorageError('NOT_FOUND', `Folder not found: ${id}`);
  const next = { ...folders[index], name: trimmed, updatedAt: Date.now() };
  const nextFolders = [...folders];
  nextFolders[index] = next;
  await storage.setItem(FOLDERS_KEY, nextFolders);
  return next;
}

/**
 * 删除文件夹。级联策略（docs/backend-design.md §5.5）：
 * - moveNotesTo: 'delete' —— 连同笔记一起删除；
 * - moveNotesTo: 文件夹 id —— 该文件夹下笔记移动到指定文件夹（误删可恢复）；
 * - moveNotesTo: 'inbox' —— 向后兼容别名，等价于默认文件夹（settings.defaultFolderId）。
 * 默认文件夹本身不可删除。
 */
export async function deleteFolder(
  id: string,
  options: { moveNotesTo: 'inbox' | 'delete' | string },
): Promise<void> {
  await ensureInitialized();
  const meta = (await storage.getItem<MetaRecord>(META_KEY))!;
  if (meta.settings.defaultFolderId === id) {
    throw new StorageError(
      'VALIDATION',
      'The default folder cannot be deleted',
    );
  }

  const folders = (await storage.getItem<FolderRecord[]>(FOLDERS_KEY)) ?? [];
  const target = folders.find((f) => f.id === id);
  if (!target) throw new StorageError('NOT_FOUND', `Folder not found: ${id}`);

  const index = (await storage.getItem<NoteIndexEntry[]>(NOTES_INDEX_KEY)) ?? [];
  const affected = index.filter((n) => n.folderId === id);
  let nextIndex = index;

  if (options.moveNotesTo === 'delete') {
    await storage.removeItems(affected.map((n) => noteContentKey(n.id)));
    nextIndex = index.filter((n) => n.folderId !== id);
  } else {
    // 'inbox' 为默认文件夹别名（向后兼容）；其余为目标文件夹 id
    const targetId =
      options.moveNotesTo === 'inbox'
        ? meta.settings.defaultFolderId
        : options.moveNotesTo;
    if (targetId === id) {
      throw new StorageError(
        'VALIDATION',
        'Cannot move notes into the folder being deleted',
      );
    }
    const targetFolder = folders.find((f) => f.id === targetId);
    if (!targetFolder) {
      throw new StorageError('NOT_FOUND', `Target folder not found: ${targetId}`);
    }
    nextIndex = index.map((n) =>
      n.folderId === id ? { ...n, folderId: targetId } : n,
    );
  }

  await storage.setItem(FOLDERS_KEY, folders.filter((f) => f.id !== id));
  await storage.setItem(NOTES_INDEX_KEY, nextIndex);
}
