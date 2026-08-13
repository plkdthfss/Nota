<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3';
import { BubbleMenu } from '@tiptap/vue-3/menus';
import { Bold, Code, Italic, Link as LinkIcon, Quote } from '@lucide/vue';
import ToolbarButton from './ToolbarButton.vue';
const props = defineProps<{ editor: Editor }>();
defineEmits<{ editLink: [] }>();
function shouldShow() {
  const { from, to } = props.editor.state.selection;
  return props.editor.isFocused && from !== to && !props.editor.isActive('codeBlock');
}
</script>

<template>
  <BubbleMenu :editor="editor" :should-show="shouldShow" :options="{ placement: 'top', offset: 8 }">
    <div class="selection-toolbar" role="toolbar" aria-label="Selection formatting">
      <ToolbarButton label="Bold" tone="dark" :active="editor.isActive('bold')" @activate="editor.chain().focus().toggleBold().run()"><Bold :size="16" /></ToolbarButton>
      <ToolbarButton label="Italic" tone="dark" :active="editor.isActive('italic')" @activate="editor.chain().focus().toggleItalic().run()"><Italic :size="16" /></ToolbarButton>
      <ToolbarButton label="Link" tone="dark" :active="editor.isActive('link')" @activate="$emit('editLink')"><LinkIcon :size="16" /></ToolbarButton>
      <ToolbarButton label="Inline code" tone="dark" :active="editor.isActive('code')" @activate="editor.chain().focus().toggleCode().run()"><Code :size="16" /></ToolbarButton>
      <ToolbarButton label="Blockquote" tone="dark" :active="editor.isActive('blockquote')" @activate="editor.chain().focus().toggleBlockquote().run()"><Quote :size="16" /></ToolbarButton>
    </div>
  </BubbleMenu>
</template>
