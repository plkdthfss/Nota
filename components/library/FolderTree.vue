<script setup lang="ts">
import type { Folder } from "../../types/library";
import FolderItem from "./FolderItem.vue";
defineProps<{ folders: Folder[] }>();
defineEmits<{ select: [id: string] }>();
</script>
<template>
  <section class="folder-section" aria-labelledby="folders-heading">
    <h2 id="folders-heading" class="section-label">FOLDERS</h2>
    <div class="folder-list">
      <FolderItem
        v-for="folder in folders"
        :key="folder.id"
        :folder="folder"
        @select="$emit('select', $event)"
      />
    </div>
  </section>
</template>
