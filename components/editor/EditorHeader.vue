<script setup lang="ts">
import { ArrowLeft, MoreHorizontal } from '@lucide/vue';
defineProps<{ path: string }>();
defineEmits<{ back: [] }>();
</script>

<template>
  <header class="editor-header">
    <button type="button" class="editor-nav-button" aria-label="Back to note library" title="Back to note library" @click="$emit('back')"><ArrowLeft :size="15" /></button>
    <span class="editor-path">{{ path }}</span>
    <button type="button" class="editor-nav-button" aria-label="More note options" title="More note options"><MoreHorizontal :size="16" /></button>
  </header>
</template>
