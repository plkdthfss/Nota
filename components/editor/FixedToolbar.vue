<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import type { Editor } from '@tiptap/vue-3';
import { Bold, Heading, Italic, Link as LinkIcon, List, MoreHorizontal, Quote } from '@lucide/vue';
import ToolbarButton from './ToolbarButton.vue';
import HeadingMenu from './HeadingMenu.vue';
import LinkPopover from './LinkPopover.vue';
import MoreFormatMenu from './MoreFormatMenu.vue';
const props = defineProps<{ editor: Editor }>();
type Popup = 'heading' | 'link' | 'more' | null;
const popup = ref<Popup>(null);
const root = ref<HTMLElement | null>(null);
function toggle(name: Exclude<Popup, null>) { popup.value = popup.value === name ? null : name; }
function close() { popup.value = null; }
function onPointerDown(event: PointerEvent) { if (root.value && !root.value.contains(event.target as Node)) close(); }
function onKeyDown(event: KeyboardEvent) { if (event.key === 'Escape') close(); }
onMounted(() => { document.addEventListener('pointerdown', onPointerDown); document.addEventListener('keydown', onKeyDown); });
onBeforeUnmount(() => { document.removeEventListener('pointerdown', onPointerDown); document.removeEventListener('keydown', onKeyDown); });
</script>

<template>
  <div ref="root" class="fixed-toolbar" role="toolbar" aria-label="Formatting toolbar">
    <ToolbarButton label="Bold" :active="editor.isActive('bold')" @activate="editor.chain().focus().toggleBold().run()"><Bold :size="16" /></ToolbarButton>
    <ToolbarButton label="Italic" :active="editor.isActive('italic')" @activate="editor.chain().focus().toggleItalic().run()"><Italic :size="16" /></ToolbarButton>
    <div class="toolbar-anchor"><ToolbarButton label="Heading" :active="editor.isActive('heading')" @activate="toggle('heading')"><Heading :size="16" /></ToolbarButton><HeadingMenu v-if="popup === 'heading'" :editor="editor" @close="close" /></div>
    <ToolbarButton label="Bullet list" :active="editor.isActive('bulletList')" @activate="editor.chain().focus().toggleBulletList().run()"><List :size="16" /></ToolbarButton>
    <ToolbarButton label="Blockquote" :active="editor.isActive('blockquote')" @activate="editor.chain().focus().toggleBlockquote().run()"><Quote :size="16" /></ToolbarButton>
    <div class="toolbar-anchor toolbar-link"><ToolbarButton label="Link" :active="editor.isActive('link')" :disabled="editor.state.selection.empty && !editor.isActive('link')" @activate="toggle('link')"><LinkIcon :size="16" /></ToolbarButton><LinkPopover v-if="popup === 'link'" :editor="editor" @close="close" /></div>
    <span class="toolbar-spacer" />
    <div class="toolbar-anchor toolbar-anchor--right"><ToolbarButton label="More formatting" :active="popup === 'more'" @activate="toggle('more')"><MoreHorizontal :size="16" /></ToolbarButton><MoreFormatMenu v-if="popup === 'more'" :editor="editor" @close="close" /></div>
  </div>
</template>
