/**
 * 存储层领域模型与消息协议类型（对应 docs/backend-design.md §2.3 / §4.1）
 *
 * chrome.storage.local Key 布局：
 *   meta           —— MetaRecord（schema 版本 + 设置）
 *   folders        —— FolderRecord[]
 *   notes:index    —— NoteIndexEntry[]（轻量索引，不含正文）
 *   note:{id}      —— NoteRecord（单条笔记全文）
 */

/** chrome.storage.local 固定 key */
export const META_KEY = 'meta';
export const FOLDERS_KEY = 'folders';
export const NOTES_INDEX_KEY = 'notes:index';

/** 单条笔记正文的 key（与笔记 id 一一对应） */
export const noteContentKey = (id: string): string => `note:${id}`;

/** 元信息 + 设置（全库唯一） */
export interface MetaRecord {
  schemaVersion: 1;
  settings: {
    /** 默认文件夹 id（新建笔记的落点） */
    defaultFolderId: string;
    /** 界面主题（亮 / 暗） */
    theme: 'light' | 'dark';
  };
}

/** 持久化文件夹（对应前端 Folder，去掉 count/expanded/selected 视图字段） */
export interface FolderRecord {
  id: string; // crypto.randomUUID() 生成；'inbox' 为初始化内置文件夹
  name: string;
  createdAt: number; // epoch ms
  updatedAt: number;
}

/** 索引条目 = 列表/搜索数据源（对应前端 NoteListItem，去掉视图字段） */
export interface NoteIndexEntry {
  id: string;
  title: string;
  /** 服务层生成：正文去 HTML 标签后截断 */
  excerpt: string;
  folderId: string;
  createdAt: number;
  updatedAt: number;
  archived: boolean; // 预留归档
}

/** 全量笔记 = 编辑器数据源（前端 EditorNoteMock 的持久化形态） */
export interface NoteRecord extends NoteIndexEntry {
  /** Tiptap HTML 正文（持久化原生格式） */
  content: string;
}

/* ------------------------------------------------------------------ */
/* 错误模型                                                             */
/* ------------------------------------------------------------------ */

export type ErrorCode =
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'QUOTA_EXCEEDED'
  | 'WRITE_THROTTLED'
  | 'INTERNAL';

export class StorageError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

/* ------------------------------------------------------------------ */
/* 消息协议（docs/backend-design.md §4.1，方案 B 备用）                   */
/* ------------------------------------------------------------------ */

export type NotePatch = Partial<
  Pick<NoteRecord, 'title' | 'content' | 'folderId' | 'archived'>
>;

export type ServiceRequest =
  | { type: 'folders:list' }
  | { type: 'folders:create'; payload: { name: string } }
  | { type: 'folders:rename'; payload: { id: string; name: string } }
  | {
      type: 'folders:delete';
      payload: { id: string; moveNotesTo: 'inbox' | 'delete' };
    }
  | { type: 'notes:list'; payload?: { folderId?: string; query?: string } }
  | { type: 'notes:get'; payload: { id: string } }
  | { type: 'notes:create'; payload?: { title?: string; folderId?: string } }
  | { type: 'notes:update'; payload: { id: string; patch: NotePatch } }
  | { type: 'notes:delete'; payload: { id: string } }
  | { type: 'notes:move'; payload: { id: string; folderId: string } }
  | { type: 'notes:search'; payload: { query: string } };

export type ServiceResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: ErrorCode; message: string } };
