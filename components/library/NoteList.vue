<script setup lang="ts">
import type { NoteListItem as Note } from "../../types/library";
import NoteListItem from "./NoteListItem.vue";
defineProps<{ notes: Note[] }>();
defineEmits<{
  select: [id: string];
  delete: [id: string];
  exportMd: [id: string];
}>();
</script>
<template>
  <section class="note-list" aria-label="Notes">
    <NoteListItem
      v-for="note in notes"
      :key="note.id"
      :note="note"
      @select="$emit('select', $event)"
      @delete="$emit('delete', $event)"
      @export-md="$emit('exportMd', $event)"
    />
  </section>
</template>
