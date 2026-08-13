<script setup lang="ts">
import { ChevronDown, ChevronRight, Folder as FolderIcon } from "@lucide/vue";
import type { Folder } from "../../types/library";
defineProps<{ folder: Folder }>();
defineEmits<{ select: [id: string] }>();
</script>
<template>
  <button
    type="button"
    class="folder-row"
    :aria-current="folder.selected"
    @click="$emit('select', folder.id)"
  >
    <component
      :is="folder.expanded ? ChevronDown : ChevronRight"
      class="folder-chevron"
      :size="14"
      aria-hidden="true"
    /><FolderIcon class="folder-icon" :size="16" aria-hidden="true" /><span
      class="folder-name"
      >{{ folder.name }}</span
    ><span class="folder-count">{{ folder.count }}</span>
  </button>
</template>
