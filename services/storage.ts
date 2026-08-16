/**
 * 存储适配层 —— 唯一直接操作 chrome.storage.local 的模块
 * （docs/backend-design.md §3.1）
 *
 * 职责：读写封装、防抖合并、批量读、onChanged 订阅、错误归一。
 */

import { browser, type Browser } from 'wxt/browser';
import { StorageError, type ErrorCode } from '../types/storage';

/* ------------------------------------------------------------------ */
/* 基础读写                                                             */
/* ------------------------------------------------------------------ */

export async function getItem<T>(key: string): Promise<T | undefined> {
  const res = await browser.storage.local.get(key);
  return res[key] as T | undefined;
}

/** 一次调用批量读多个 key（返回 { [key]: value }，缺省 key 不出现在结果中） */
export async function getMany<T>(
  keys: string[],
): Promise<Record<string, T>> {
  if (keys.length === 0) return {};
  const res = await browser.storage.local.get(keys);
  return res as Record<string, T>;
}

export async function setItem(key: string, value: unknown): Promise<void> {
  await write(() => browser.storage.local.set({ [key]: value }));
}

/** 多 key 合并为一次写入（只占一次写配额） */
export async function setItems(
  entries: Record<string, unknown>,
): Promise<void> {
  await write(() => browser.storage.local.set(entries));
}

export async function removeItems(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  await write(() => browser.storage.local.remove(keys));
}

/* ------------------------------------------------------------------ */
/* 防抖合并写（自动保存用）                                              */
/* ------------------------------------------------------------------ */

const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
const pendingWrites = new Map<string, unknown>();

/** 高频写入合并：waitMs 内同一 key 只落盘最后一次 */
export function debouncedSet(
  key: string,
  value: unknown,
  waitMs = 800,
): void {
  pendingWrites.set(key, value);
  const existing = debounceTimers.get(key);
  if (existing) clearTimeout(existing);
  debounceTimers.set(
    key,
    setTimeout(() => {
      void flushPending(key);
    }, waitMs),
  );
}

/** 取消某个 key 的挂起写入（删除笔记前必须调用，防止已删内容被写回） */
export function cancelPending(key: string): void {
  const timer = debounceTimers.get(key);
  if (timer) clearTimeout(timer);
  debounceTimers.delete(key);
  pendingWrites.delete(key);
}

/** 立即落盘挂起写入（key 缺省时 flush 全部） */
export async function flushPending(key?: string): Promise<void> {
  const targets = key ? [key] : [...pendingWrites.keys()];
  for (const k of targets) {
    const timer = debounceTimers.get(k);
    if (timer) clearTimeout(timer);
    debounceTimers.delete(k);
    const value = pendingWrites.get(k);
    pendingWrites.delete(k);
    if (value !== undefined) {
      await setItem(k, value).catch(() => {
        /* 落盘失败不抛出（自动保存为尽力而为） */
      });
    }
  }
}

/* ------------------------------------------------------------------ */
/* 变更订阅                                                             */
/* ------------------------------------------------------------------ */

export function onChanged(
  cb: (
    changes: Record<string, Browser.storage.StorageChange>,
    area: 'local',
  ) => void,
): () => void {
  const listener = (
    changes: Record<string, Browser.storage.StorageChange>,
    areaName: string,
  ) => {
    if (areaName === 'local') cb(changes, 'local');
  };
  browser.storage.onChanged.addListener(listener);
  return () => browser.storage.onChanged.removeListener(listener);
}

/* ------------------------------------------------------------------ */
/* 错误归一                                                             */
/* ------------------------------------------------------------------ */

async function write<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (err) {
    throw normalizeError(err);
  }
}

export function normalizeError(err: unknown): StorageError {
  const message = err instanceof Error ? err.message : String(err);
  let code: ErrorCode = 'INTERNAL';
  if (/QUOTA_BYTES|quota exceeded/i.test(message)) code = 'QUOTA_EXCEEDED';
  else if (/MAX_WRITE_OPERATIONS|throttl/i.test(message))
    code = 'WRITE_THROTTLED';
  return new StorageError(code, message);
}
