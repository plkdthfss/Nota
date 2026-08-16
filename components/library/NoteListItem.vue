<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { Download, MoreHorizontal, Trash2, X } from "@lucide/vue";
import type { NoteListItem } from "../../types/library";
import IconButton from "../common/IconButton.vue";

const props = defineProps<{ note: NoteListItem }>();
const emit = defineEmits<{
  select: [id: string];
  delete: [id: string];
  /** 导出为 Markdown 文件 */
  exportMd: [id: string];
}>();

const menuOpen = ref(false);
const mode = ref<"menu" | "confirm">("menu");
const root = ref<HTMLElement | null>(null);

function onCardKey(event: KeyboardEvent) {
  // 选项按钮/弹层内部键盘事件自行处理（Enter/Space 激活按钮），不触发卡片 select
  const target = event.target as HTMLElement | null;
  if (root.value && target && root.value.contains(target)) return;
  if (!menuOpen.value) {
    event.preventDefault();
    emit("select", props.note.id);
  }
}

function toggleMenu() {
  if (menuOpen.value) closeMenu();
  else {
    mode.value = "menu";
    menuOpen.value = true;
  }
}

function closeMenu() {
  menuOpen.value = false;
  mode.value = "menu";
}

function confirmDelete() {
  closeMenu();
  emit("delete", props.note.id);
}

function exportMarkdown() {
  closeMenu();
  emit("exportMd", props.note.id);
}

/** 点击弹层外部关闭（与编辑器弹层交互一致） */
function onPointerDown(event: PointerEvent) {
  if (root.value && !root.value.contains(event.target as Node)) closeMenu();
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") closeMenu();
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
  <article
    class="note-card"
    role="button"
    tabindex="0"
    :aria-pressed="note.selected"
    @click="$emit('select', note.id)"
    @keydown.enter="onCardKey"
    @keydown.space="onCardKey"
  >
    <div class="note-title-row">
      <span class="note-title">{{ note.title }}</span
      ><span ref="root" class="note-options-wrap" @click.stop>
        <IconButton
          label="Note options"
          size="small"
          aria-haspopup="menu"
          :aria-expanded="menuOpen"
          @click="toggleMenu"
        >
          <MoreHorizontal :size="16" />
        </IconButton>
        <div
          v-if="menuOpen"
          class="note-menu"
          role="menu"
          aria-label="Note options"
        >
          <template v-if="mode === 'menu'">
            <button
              type="button"
              class="note-menu-item is-danger"
              role="menuitem"
              @click="mode = 'confirm'"
            >
              <Trash2 :size="14" aria-hidden="true" />
              <span>Delete</span>
            </button>
            <button
              type="button"
              class="note-menu-item"
              role="menuitem"
              @click="exportMarkdown"
            >
              <Download :size="14" aria-hidden="true" />
              <span>Export markdown</span>
            </button>
          </template>
          <div v-else class="note-menu-confirm">
            <span class="note-menu-confirm-label">Delete note?</span>
            <div class="note-menu-confirm-actions">
              <button
                type="button"
                class="note-menu-action"
                aria-label="Cancel"
                title="Cancel"
                @click="closeMenu"
              >
                <X :size="14" />
              </button>
              <button
                type="button"
                class="note-menu-action is-danger"
                @click="confirmDelete"
              >
                <Trash2 :size="14" aria-hidden="true" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      </span>
    </div>
    <p class="note-excerpt">{{ note.excerpt }}</p>
    <div class="note-meta">
      <span class="note-folder">{{ note.folderName }}</span
      ><span class="note-time">{{ note.updatedLabel }}</span>
    </div>
  </article>
</template>
