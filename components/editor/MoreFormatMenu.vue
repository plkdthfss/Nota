<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3';
const props = defineProps<{ editor: Editor }>();
defineEmits<{ close: [] }>();
type MenuItem = { label: string; active: () => boolean; disabled?: () => boolean; run: () => void };
const items: MenuItem[] = [
  { label: 'Strike', active: () => props.editor.isActive('strike'), run: () => props.editor.chain().focus().toggleStrike().run() },
  { label: 'Inline code', active: () => props.editor.isActive('code'), run: () => props.editor.chain().focus().toggleCode().run() },
  { label: 'Code block', active: () => props.editor.isActive('codeBlock'), run: () => props.editor.chain().focus().toggleCodeBlock().run() },
  { label: 'Ordered list', active: () => props.editor.isActive('orderedList'), run: () => props.editor.chain().focus().toggleOrderedList().run() },
  { label: 'Task list', active: () => props.editor.isActive('taskList'), run: () => props.editor.chain().focus().toggleTaskList().run() },
  { label: 'Horizontal rule', active: () => false, run: () => props.editor.chain().focus().setHorizontalRule().run() },
  { label: 'Undo', active: () => false, disabled: () => !props.editor.can().chain().focus().undo().run(), run: () => props.editor.chain().focus().undo().run() },
  { label: 'Redo', active: () => false, disabled: () => !props.editor.can().chain().focus().redo().run(), run: () => props.editor.chain().focus().redo().run() },
];
</script>

<template>
  <div class="editor-popup more-menu" role="menu" aria-label="More formatting">
    <button v-for="item in items" :key="item.label" type="button" :class="{ 'is-active': item.active() }" :disabled="item.disabled?.()" @mousedown.prevent @click="item.run(); $emit('close')">{{ item.label }}</button>
  </div>
</template>
