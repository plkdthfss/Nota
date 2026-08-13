<script setup lang="ts">
import { ref } from 'vue';
import { EditorContent } from '@tiptap/vue-3';
import { editorMock } from '../../mock/editorMock';
import { useTiptapEditor } from '../../composables/useTiptapEditor';
import EditorHeader from './EditorHeader.vue';
import EditorTitleBlock from './EditorTitleBlock.vue';
import FixedToolbar from './FixedToolbar.vue';
import SelectionToolbar from './SelectionToolbar.vue';
import LinkPopover from './LinkPopover.vue';
import EditorStatusBar from './EditorStatusBar.vue';
defineEmits<{ back: [] }>();
const title = ref(editorMock.title);
const selectionLinkOpen = ref(false);
const { editor, wordCount } = useTiptapEditor(editorMock.content);
</script>

<template>
  <main class="note-editor-shell">
    <EditorHeader :path="editorMock.path" @back="$emit('back')" />
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
