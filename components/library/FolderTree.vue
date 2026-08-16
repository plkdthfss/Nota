<script setup lang="ts">
import type { Folder } from "../../types/library";
import FolderItem from "./FolderItem.vue";

const props = defineProps<{ folders: Folder[]; defaultFolderId?: string }>();
defineEmits<{
  select: [id: string];
  /** moveNotesTo: 'delete' 删除笔记；否则为目标文件夹 id */
  deleteFolder: [id: string, moveNotesTo: "delete" | string];
}>();

/** 删除某文件夹时可移入的目标列表（排除该文件夹自身） */
function moveTargetsFor(id: string): { id: string; name: string }[] {
  return props.folders
    .filter((f) => f.id !== id)
    .map((f) => ({ id: f.id, name: f.name }));
}
</script>
<template>
  <section class="folder-section" aria-labelledby="folders-heading">
    <h2 id="folders-heading" class="section-label">FOLDERS</h2>
    <div class="folder-list">
      <FolderItem
        v-for="folder in folders"
        :key="folder.id"
        :folder="folder"
        :deletable="folder.id !== defaultFolderId"
        :move-targets="moveTargetsFor(folder.id)"
        @select="$emit('select', $event)"
        @delete-folder="(id, moveNotesTo) => $emit('deleteFolder', id, moveNotesTo)"
      />
    </div>
  </section>
</template>
