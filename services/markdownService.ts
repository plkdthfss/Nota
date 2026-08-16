/**
 * Markdown 转换服务
 * （docs/backend-design.md §3.5）
 *
 * 约定：正文以 Tiptap HTML 持久化；HTML↔Markdown 转换只发生在导入/导出/剪藏边界。
 * 底层使用 @tiptap/markdown 的 MarkdownManager（内部基于 marked）与
 * @tiptap/core 的 generateJSON / generateHTML。
 */

import { generateHTML, generateJSON } from '@tiptap/core';
import { MarkdownManager } from '@tiptap/markdown';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';

/** 与编辑器（useTiptapEditor）保持一致的扩展集合，保证往返转换不丢节点 */
const extensions = [StarterKit, Link, TaskList, TaskItem];

let manager: MarkdownManager | null = null;
function getManager(): MarkdownManager {
  if (!manager) manager = new MarkdownManager({ extensions });
  return manager;
}

export async function htmlToMarkdown(html: string): Promise<string> {
  if (!html) return '';
  const json = generateJSON(html, extensions);
  return getManager().serialize(json);
}

export async function markdownToHtml(markdown: string): Promise<string> {
  if (!markdown.trim()) return '<p></p>';
  const json = getManager().parse(markdown);
  return generateHTML(json, extensions);
}
