/**
 * 设置服务
 * （docs/backend-design.md §3.6）
 */

import { META_KEY, type MetaRecord } from '../types/storage';
import * as storage from './storage';
import { ensureInitialized } from './noteService';

export type Settings = MetaRecord['settings'];

/** 读取设置；旧数据缺失 theme 字段时回退为 'light'（新增字段给默认值，无需迁移） */
export async function getSettings(): Promise<Settings> {
  await ensureInitialized();
  const meta = (await storage.getItem<MetaRecord>(META_KEY))!;
  return {
    ...meta.settings,
    theme: meta.settings.theme ?? 'light',
  };
}

export async function setSettings(patch: Partial<Settings>): Promise<Settings> {
  await ensureInitialized();
  const current = await getSettings();
  const next: MetaRecord = {
    ...(await storage.getItem<MetaRecord>(META_KEY))!,
    settings: { ...current, ...patch },
  };
  await storage.setItem(META_KEY, next);
  return next.settings;
}
