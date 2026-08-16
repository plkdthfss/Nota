/**
 * 笔记服务 —— 笔记 CRUD / 移动 / 索引维护
 * （docs/backend-design.md §3.3）
 *
 * 约定：
 * - 正文以 Tiptap HTML 持久化；excerpt 由服务层从正文生成；
 * - 每次变更同时更新 `note:{id}` 与 `notes:index`（一次 setItems 合并写入）；
 * - 所有函数 Promise 化、幂等初始化、无全局可变状态。
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
  type NotePatch,
  type NoteRecord,
} from '../types/storage';
import * as storage from './storage';

/** 初始化 Promise（单例，避免重复初始化竞态） */
let initPromise: Promise<void> | null = null;

export function ensureInitialized(): Promise<void> {
  if (!initPromise) initPromise = init();
  return initPromise;
}

/** 首次启动写入默认库：schema、默认文件夹、示例笔记 */
async function init(): Promise<void> {
  const existing = await storage.getItem<MetaRecord>(META_KEY);
  if (existing) return;

  const now = Date.now();
  const inboxId = 'inbox';
  const inbox: FolderRecord = {
    id: inboxId,
    name: 'Inbox',
    createdAt: now,
    updatedAt: now,
  };

  const welcomeContent = [
    '<h1>Welcome to SideNote</h1>',
    '<p>Your notes live in <code>chrome.storage.local</code> — offline, private, and always available in the side panel.</p>',
    '<ul data-type="taskList">',
    '<li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Click the SideNote icon in the toolbar to open the panel</p></div></li>',
    '<li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Press the + button to create a new note</p></div></li>',
    '<li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Try the search box to find anything instantly</p></div></li>',
    '</ul>',
  ].join('');

  const welcomeId = 'welcome';
  const welcome: NoteRecord = {
    id: welcomeId,
    title: 'Welcome to SideNote',
    excerpt: buildExcerpt(welcomeContent),
    folderId: inboxId,
    createdAt: now,
    updatedAt: now,
    archived: false,
    content: welcomeContent,
  };

  await storage.setItems({
    [META_KEY]: {
      schemaVersion: 1,
      settings: { defaultFolderId: inboxId, theme: 'light' },
    },
    [FOLDERS_KEY]: [inbox],
    [NOTES_INDEX_KEY]: [welcome],
    [noteContentKey(welcomeId)]: welcome,
  });
}

/* ------------------------------------------------------------------ */
/* 查询                                                                 */
/* ------------------------------------------------------------------ */

export async function listNotes(
  options: { folderId?: string; query?: string; archived?: boolean } = {},
): Promise<NoteIndexEntry[]> {
  await ensureInitialized();
  let notes = (await storage.getItem<NoteIndexEntry[]>(NOTES_INDEX_KEY)) ?? [];
  if (options.folderId) notes = notes.filter((n) => n.folderId === options.folderId);
  if (options.archived !== undefined) notes = notes.filter((n) => n.archived === options.archived);
  if (options.query) {
    const q = options.query.trim().toLowerCase();
    if (q) {
      notes = notes.filter(
        (n) =>
          n.title.toLowerCase().includes(q) || n.excerpt.toLowerCase().includes(q),
      );
    }
  }
  return notes.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getNote(id: string): Promise<NoteRecord | undefined> {
  await ensureInitialized();
  return storage.getItem<NoteRecord>(noteContentKey(id));
}

/* ------------------------------------------------------------------ */
/* 写操作                                                               */
/* ------------------------------------------------------------------ */

export async function createNote(
  input: { title?: string; folderId?: string; content?: string } = {},
): Promise<NoteRecord> {
  await ensureInitialized();
  const meta = (await storage.getItem<MetaRecord>(META_KEY))!;
  const id = crypto.randomUUID();
  const now = Date.now();
  const title = (input.title ?? '').trim() || 'Untitled';
  const folderId = input.folderId ?? meta.settings.defaultFolderId;
  const content = input.content ?? '';
  const record: NoteRecord = {
    id,
    title,
    excerpt: buildExcerpt(content),
    folderId,
    createdAt: now,
    updatedAt: now,
    archived: false,
    content,
  };
  const index = (await storage.getItem<NoteIndexEntry[]>(NOTES_INDEX_KEY)) ?? [];
  await storage.setItems({
    [noteContentKey(id)]: record,
    [NOTES_INDEX_KEY]: [...index, record],
  });
  return record;
}

export async function updateNote(
  id: string,
  patch: NotePatch,
): Promise<NoteRecord> {
  await ensureInitialized();
  const existing = await storage.getItem<NoteRecord>(noteContentKey(id));
  if (!existing) {
    throw new StorageError('NOT_FOUND', `Note not found: ${id}`);
  }
  const next: NoteRecord = {
    ...existing,
    ...patch,
    excerpt:
      patch.content !== undefined ? buildExcerpt(patch.content) : existing.excerpt,
    updatedAt: Date.now(),
  };
  if (patch.title !== undefined) next.title = patch.title.trim() || 'Untitled';

  const index = (await storage.getItem<NoteIndexEntry[]>(NOTES_INDEX_KEY)) ?? [];
  const nextIndex = index.map((n) => (n.id === id ? next : n));
  // 正文与索引一次合并写入，避免半更新状态
  await storage.setItems({
    [noteContentKey(id)]: next,
    [NOTES_INDEX_KEY]: nextIndex,
  });
  return next;
}

export async function deleteNote(id: string): Promise<void> {
  await ensureInitialized();
  // 先取消该笔记挂起的防抖写入，防止已删内容被写回（复活）
  storage.cancelPending(noteContentKey(id));
  const index = (await storage.getItem<NoteIndexEntry[]>(NOTES_INDEX_KEY)) ?? [];
  const nextIndex = index.filter((n) => n.id !== id);
  await storage.removeItems([noteContentKey(id)]);
  await storage.setItem(NOTES_INDEX_KEY, nextIndex);
}

export async function moveNote(id: string, folderId: string): Promise<NoteRecord> {
  return updateNote(id, { folderId });
}

/* ------------------------------------------------------------------ */
/* 工具                                                                 */
/* ------------------------------------------------------------------ */

/** 从 HTML 正文生成摘要：去标签、解实体、折叠空白、截断 */
export function buildExcerpt(html: string, max = 120): string {
  if (!html) return '';
  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}
