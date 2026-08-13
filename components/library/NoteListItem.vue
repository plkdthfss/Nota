<script setup lang="ts">
import { MoreHorizontal } from "@lucide/vue";
import type { NoteListItem } from "../../types/library";
import IconButton from "../common/IconButton.vue";
defineProps<{ note: NoteListItem }>();
defineEmits<{ select: [id: string] }>();
</script>
<template>
  <article
    class="note-card"
    role="button"
    tabindex="0"
    :aria-pressed="note.selected"
    @click="$emit('select', note.id)"
    @keydown.enter.prevent="$emit('select', note.id)"
    @keydown.space.prevent="$emit('select', note.id)"
  >
    <div class="note-title-row">
      <span class="note-title">{{ note.title }}</span
      ><IconButton label="Note options" size="small" @click.stop
        ><MoreHorizontal :size="16"
      /></IconButton>
    </div>
    <p class="note-excerpt">{{ note.excerpt }}</p>
    <div class="note-meta">
      <span class="note-folder">{{ note.folderName }}</span
      ><span class="note-time">{{ note.updatedLabel }}</span>
    </div>
  </article>
</template>
