/**
 * 搜索服务 —— 无数据库的混合搜索
 * （docs/backend-design.md §3.4）
 *
 * 策略：
 * 1. 先匹配 notes:index 的 title / excerpt（快路径）；
 * 2. 命中不足时，对最多 SCAN_LIMIT 条候选笔记做全文扫描（一次批量读取）；
 * 3. 结果去重、按 updatedAt 倒序、截断到 limit。
 *
 * 已知限制：全文扫描有候选条数上限，超出部分可能漏命中（列表文案已按
 * "in all folders" 展示，属可接受的 MVP 权衡）。
 */

import { NOTES_INDEX_KEY, noteContentKey, type NoteIndexEntry, type NoteRecord } from '../types/storage';
import * as storage from './storage';
import { ensureInitialized } from './noteService';

/** 全文扫描候选上限 */
const SCAN_LIMIT = 200;
/** 默认返回条数 */
const DEFAULT_LIMIT = 20;

export async function searchNotes(
  query: string,
  options: { limit?: number } = {},
): Promise<NoteIndexEntry[]> {
  const limit = options.limit ?? DEFAULT_LIMIT;
  const q = query.trim().toLowerCase();
  if (!q) return [];
  await ensureInitialized();

  const index = (await storage.getItem<NoteIndexEntry[]>(NOTES_INDEX_KEY)) ?? [];
  const matched = new Map<string, NoteIndexEntry>();

  // 快路径：标题 / 摘要
  for (const note of index) {
    if (
      note.title.toLowerCase().includes(q) ||
      note.excerpt.toLowerCase().includes(q)
    ) {
      matched.set(note.id, note);
    }
  }

  // 慢路径：全文扫描（一次批量读，避免逐条往返）
  if (matched.size < limit) {
    const candidates = index
      .filter((n) => !matched.has(n.id))
      .slice(0, SCAN_LIMIT);
    const keys = candidates.map((n) => noteContentKey(n.id));
    if (keys.length > 0) {
      const contents = await storage.getMany<NoteRecord>(keys);
      for (const note of candidates) {
        const rec = contents[noteContentKey(note.id)];
        if (rec?.content?.toLowerCase().includes(q)) {
          matched.set(note.id, note);
        }
      }
    }
  }

  return [...matched.values()]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, limit);
}
