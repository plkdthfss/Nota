<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import {
  ChevronDown,
  ChevronRight,
  Folder as FolderIcon,
  MoreHorizontal,
  Trash2,
  X,
} from "@lucide/vue";
import type { Folder } from "../../types/library";
import IconButton from "../common/IconButton.vue";

const props = withDefaults(
  defineProps<{
    folder: Folder;
    deletable?: boolean;
    /** 可移入的目标文件夹（排除自身），由 FolderTree 计算传入 */
    moveTargets?: { id: string; name: string }[];
  }>(),
  { deletable: true, moveTargets: () => [] },
);

const emit = defineEmits<{
  select: [id: string];
  /** moveNotesTo: 'delete' 删除笔记；否则为目标文件夹 id */
  deleteFolder: [id: string, moveNotesTo: 'delete' | string];
}>();

const open = ref(false);
const mode = ref<"menu" | "confirm">("menu");
const targetFolderId = ref("");
const root = ref<HTMLElement | null>(null);

function toggleMenu() {
  if (open.value) close();
  else {
    mode.value = "menu";
    open.value = true;
  }
}

function requestDelete() {
  // 空文件夹没有笔记可移动：直接删除，不进入移动确认态
  if (props.folder.count === 0) {
    close();
    emit("deleteFolder", props.folder.id, "delete");
    return;
  }
  mode.value = "confirm";
  // 默认选中第一个可移入的文件夹
  targetFolderId.value = props.moveTargets[0]?.id ?? "";
}

function close() {
  open.value = false;
  mode.value = "menu";
}

function confirmMove() {
  if (!targetFolderId.value) return;
  close();
  emit("deleteFolder", props.folder.id, targetFolderId.value);
}

function confirmDeleteNotes() {
  close();
  emit("deleteFolder", props.folder.id, "delete");
}

/** 点击弹层外部关闭（与 NewNoteButton / 编辑器弹层交互一致） */
function onPointerDown(event: PointerEvent) {
  if (root.value && !root.value.contains(event.target as Node)) close();
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") close();
}

onMounted(() => {
  document.addEventListener("pointerdown", onPointerDown);
  document.addEventListener("keydown", onKeydown);
});

onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", onPointerDown);
  document.removeEventListener("keydown", onKeydown);
});
</script>
<template>
  <div ref="root" class="folder-item">
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
    <IconButton
      v-if="deletable"
      class="folder-options"
      label="Folder options"
      aria-haspopup="menu"
      :aria-expanded="open"
      @click.stop="toggleMenu"
    >
      <MoreHorizontal :size="16" aria-hidden="true" />
    </IconButton>
    <Transition name="folder-menu">
      <div
        v-if="open"
        class="folder-menu"
        role="menu"
        aria-label="Folder options"
      >
        <template v-if="mode === 'menu'">
          <button
            type="button"
            class="folder-menu-item"
            role="menuitem"
            @click.stop="requestDelete"
          >
            <Trash2 :size="16" aria-hidden="true" />
            <span>Delete folder</span>
          </button>
        </template>
        <div v-else class="folder-menu-confirm">
          <div class="folder-menu-confirm-head">
            <span class="folder-menu-title">Delete "{{ folder.name }}"?</span>
            <button
              type="button"
              class="folder-menu-action is-icon"
              aria-label="Cancel"
              title="Cancel"
              @click.stop="close"
            >
              <X :size="14" aria-hidden="true" />
            </button>
          </div>
          <div class="folder-menu-move">
            <span class="folder-menu-move-label">Move notes to</span>
            <select
              v-model="targetFolderId"
              class="folder-menu-select"
              aria-label="Move notes to folder"
              @click.stop
            >
              <option
                v-for="target in moveTargets"
                :key="target.id"
                :value="target.id"
              >
                {{ target.name }}
              </option>
            </select>
          </div>
          <div class="folder-menu-actions">
            <button
              type="button"
              class="folder-menu-action is-accent"
              :disabled="!targetFolderId"
              @click.stop="confirmMove"
            >
              Move
            </button>
            <button
              type="button"
              class="folder-menu-action is-danger"
              @click.stop="confirmDeleteNotes"
            >
              Delete notes
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
