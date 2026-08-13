<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import type { Editor } from "@tiptap/vue-3";
const props = defineProps<{
  editor: Editor;
  placement?: "toolbar" | "selection";
}>();
const emit = defineEmits<{ close: [] }>();
const url = ref(String(props.editor.getAttributes("link").href ?? ""));
const input = ref<HTMLInputElement | null>(null);
const root = ref<HTMLElement | null>(null);
const selection = {
  from: props.editor.state.selection.from,
  to: props.editor.state.selection.to,
};
function onPointerDown(event: PointerEvent) {
  if (root.value && !root.value.contains(event.target as Node)) emit("close");
}
function onKeyDown(event: KeyboardEvent) {
  if (event.key === "Escape") emit("close");
}
onMounted(() => {
  document.addEventListener("pointerdown", onPointerDown);
  document.addEventListener("keydown", onKeyDown);
  nextTick(() => input.value?.focus());
});
onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", onPointerDown);
  document.removeEventListener("keydown", onKeyDown);
});
function applyLink() {
  const href = url.value.trim();
  if (!href) return;
  props.editor
    .chain()
    .focus()
    .setTextSelection(selection)
    .extendMarkRange("link")
    .setLink({ href })
    .run();
  emit("close");
}
function removeLink() {
  props.editor
    .chain()
    .focus()
    .setTextSelection(selection)
    .extendMarkRange("link")
    .unsetLink()
    .run();
  emit("close");
}
</script>

<template>
  <div
    ref="root"
    class="editor-popup link-popover"
    :class="`link-popover--${placement ?? 'toolbar'}`"
    role="dialog"
    aria-label="Edit link"
  >
    <input
      ref="input"
      v-model="url"
      type="url"
      aria-label="Link URL"
      placeholder="https://example.com"
      @keydown.enter.prevent="applyLink"
      @keydown.esc.prevent="$emit('close')"
    />
    <div class="link-actions">
      <button type="button" @click="removeLink">Remove</button
      ><button
        type="button"
        class="is-primary"
        :disabled="!url.trim()"
        @click="applyLink"
      >
        Apply
      </button>
    </div>
  </div>
</template>
