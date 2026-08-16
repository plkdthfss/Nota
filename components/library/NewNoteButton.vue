<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { Check, FilePlus, FolderPlus, Plus, X } from '@lucide/vue';

const emit = defineEmits<{
  /** 在选中的文件夹中新建笔记 */
  create: [];
  /** 新建文件夹（携带名称） */
  createFolder: [name: string];
}>();

const open = ref(false);
const mode = ref<'pick' | 'folder'>('pick');
const folderName = ref('');
const input = ref<HTMLInputElement | null>(null);
const root = ref<HTMLElement | null>(null);

function toggle() {
  if (open.value) close();
  else {
    mode.value = 'pick';
    open.value = true;
  }
}

function close() {
  open.value = false;
  mode.value = 'pick';
  folderName.value = '';
}

function chooseNote() {
  close();
  emit('create');
}

function chooseFolder() {
  mode.value = 'folder';
  nextTick(() => input.value?.focus());
}

function confirmFolder() {
  const name = folderName.value.trim();
  if (!name) return;
  close();
  emit('createFolder', name);
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') close();
  if (event.key === 'Enter' && mode.value === 'folder') confirmFolder();
}

/** 点击弹层外部关闭（与编辑器弹层交互一致） */
function onPointerDown(event: PointerEvent) {
  if (root.value && !root.value.contains(event.target as Node)) close();
}

onMounted(() => {
  document.addEventListener('pointerdown', onPointerDown);
  document.addEventListener('keydown', onKeydown);
});

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onPointerDown);
  document.removeEventListener('keydown', onKeydown);
});
</script>

<template>
  <div ref="root" class="fab-wrap">
    <Transition name="fab-menu">
      <div v-if="open" class="fab-menu" role="menu" aria-label="Create">
        <template v-if="mode === 'pick'">
          <button
            type="button"
            class="fab-menu-item"
            role="menuitem"
            @click="chooseNote"
          >
            <FilePlus :size="16" aria-hidden="true" />
            <span>New note</span>
          </button>
          <button
            type="button"
            class="fab-menu-item"
            role="menuitem"
            @click="chooseFolder"
          >
            <FolderPlus :size="16" aria-hidden="true" />
            <span>New folder</span>
          </button>
        </template>
        <div v-else class="fab-menu-folder">
          <input
            ref="input"
            v-model="folderName"
            class="fab-menu-input"
            type="text"
            aria-label="Folder name"
            placeholder="Folder name"
            @keydown.enter.prevent="confirmFolder"
            @keydown.esc.prevent="close"
          />
          <div class="fab-menu-actions">
            <button
              type="button"
              class="fab-menu-action"
              aria-label="Cancel"
              title="Cancel"
              @click="close"
            >
              <X :size="14" />
            </button>
            <button
              type="button"
              class="fab-menu-action is-primary"
              aria-label="Create folder"
              title="Create folder"
              :disabled="!folderName.trim()"
              @click="confirmFolder"
            >
              <Check :size="14" />
            </button>
          </div>
        </div>
      </div>
    </Transition>
    <button
      type="button"
      class="fab"
      :class="{ 'is-open': open }"
      :aria-label="open ? 'Close create menu' : 'Create'"
      :aria-expanded="open"
      :title="open ? 'Close create menu' : 'Create'"
      @click="toggle"
    >
      <Plus class="plus-icon" :size="18" />
    </button>
  </div>
</template>
