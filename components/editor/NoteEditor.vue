<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';
import { EditorContent, type Editor } from '@tiptap/vue-3';
import { useTiptapEditor } from '../../composables/useTiptapEditor';
import { getNote, updateNote } from '../../services/noteService';
import { listFolders } from '../../services/folderService';
import type { NotePatch } from '../../types/storage';
import EditorHeader from './EditorHeader.vue';
import EditorTitleBlock from './EditorTitleBlock.vue';
import FixedToolbar from './FixedToolbar.vue';
import SelectionToolbar from './SelectionToolbar.vue';
import LinkPopover from './LinkPopover.vue';
import EditorStatusBar from './EditorStatusBar.vue';

const props = defineProps<{ noteId: string }>();
const emit = defineEmits<{ back: [] }>();

const title = ref('');
const path = ref('');
const loaded = ref(false);
const selectionLinkOpen = ref(false);
const { editor, wordCount } = useTiptapEditor('');

/* ------------------------------------------------------------------ */
/* 加载                                                                 */
/* ------------------------------------------------------------------ */

/** 等待编辑器实例就绪（useEditor 为异步创建） */
function waitForEditor(): Promise<Editor> {
  return new Promise((resolve) => {
    if (editor.value) return resolve(editor.value);
    const stop = watch(
      () => editor.value,
      (e) => {
        if (e) {
          stop();
          resolve(e);
        }
      },
    );
  });
}

async function loadNote() {
  const [note, folders, instance] = await Promise.all([
    getNote(props.noteId),
    listFolders(),
    waitForEditor(),
  ]);
  if (!note) return; // 笔记不存在：保持空编辑器（不自动保存）
  // 先记录已持久化标题，避免加载触发的 watch 把同一标题回写（顶高 updatedAt）
  lastSavedTitle = note.title;
  title.value = note.title;
  path.value = folders.find((f) => f.id === note.folderId)?.name ?? '';
  instance.commands.setContent(note.content);
  wordCount.value = instance.storage.characterCount.words();
  loaded.value = true;
}

void loadNote();

/* ------------------------------------------------------------------ */
/* 自动保存（docs/backend-design.md §5.4：800ms 防抖 + 关闭前 flush）    */
/* ------------------------------------------------------------------ */

const SAVE_DELAY = 800;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let pendingPatch: NotePatch | null = null;

/** 合并待存 patch（标题/正文连续修改时互相覆盖，必须合并而非替换） */
function scheduleSave(patch: NotePatch) {
  pendingPatch = { ...(pendingPatch ?? {}), ...patch };
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    void saveNow();
  }, SAVE_DELAY);
}

/** 立即落盘挂起的保存（返回前 / 隐藏前调用） */
async function saveNow() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  const patch = pendingPatch;
  pendingPatch = null;
  if (!patch) return;
  try {
    await updateNote(props.noteId, patch);
  } catch {
    /* 笔记已被删除等场景：静默丢弃本次保存 */
  }
}

const flushPendingSave = saveNow;

let lastSavedTitle = '';
watch(title, (value) => {
  if (!loaded.value || value === lastSavedTitle) return;
  lastSavedTitle = value;
  scheduleSave({ title: value });
});

watch(
  () => editor.value,
  (instance) => {
    if (!instance) return;
    instance.on('update', () => {
      if (!loaded.value) return;
      wordCount.value = instance.storage.characterCount.words();
      scheduleSave({ content: instance.getHTML() });
    });
  },
);

async function goBack() {
  await flushPendingSave();
  emit('back');
}

/** 侧边栏隐藏（切走/关闭）时强制落盘，避免丢最后几键 */
function onVisibilityChange() {
  if (document.visibilityState === 'hidden') {
    void flushPendingSave();
  }
}
document.addEventListener('visibilitychange', onVisibilityChange);
onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', onVisibilityChange);
  if (saveTimer) clearTimeout(saveTimer);
});
</script>

<template>
  <main class="note-editor-shell">
    <EditorHeader :path="path" @back="goBack" />
    <EditorTitleBlock v-model="title" />
    <FixedToolbar v-if="editor" :editor="editor" />
    <div v-else class="fixed-toolbar" aria-hidden="true" />
    <section class="editor-body" aria-label="Editor body">
      <EditorContent v-if="editor" :editor="editor" />
      <SelectionToolbar v-if="editor" :editor="editor" @edit-link="selectionLinkOpen = true" />
      <LinkPopover v-if="editor && selectionLinkOpen" :editor="editor" placement="selection" @close="selectionLinkOpen = false" />
    </section>
    <EditorStatusBar :word-count="wordCount" />
  </main>
</template>
