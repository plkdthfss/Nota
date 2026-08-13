<script setup lang="ts">
import type { Editor } from "@tiptap/vue-3";
defineProps<{ editor: Editor }>();
defineEmits<{ close: [] }>();
</script>

<template>
  <div class="editor-popup heading-menu" role="menu" aria-label="Text style">
    <button
      type="button"
      :class="{ 'is-active': editor.isActive('paragraph') }"
      @mousedown.prevent
      @click="
        editor.chain().focus().setParagraph().run();
        $emit('close');
      "
    >
      Paragraph
    </button>
    <button
      v-for="level in [1, 2, 3] as const"
      :key="level"
      type="button"
      :class="{ 'is-active': editor.isActive('heading', { level }) }"
      @mousedown.prevent
      @click="
        editor.chain().focus().toggleHeading({ level }).run();
        $emit('close');
      "
    >
      Heading {{ level }}
    </button>
  </div>
</template>
