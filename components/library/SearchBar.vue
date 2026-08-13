<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import { Search, X } from "@lucide/vue";
import IconButton from "../common/IconButton.vue";
const props = defineProps<{ modelValue: string; focusRequest: number }>();
const emit = defineEmits<{ "update:modelValue": [value: string]; clear: [] }>();
const input = ref<HTMLInputElement | null>(null);
watch(
  () => props.focusRequest,
  () => nextTick(() => input.value?.focus()),
);
function clearSearch() {
  emit("update:modelValue", "");
  emit("clear");
  nextTick(() => input.value?.focus());
}
</script>
<template>
  <section class="search-section">
    <div class="search-box">
      <Search :size="16" aria-hidden="true" /><input
        ref="input"
        class="search-input"
        type="search"
        aria-label="Search notes"
        placeholder="Search notes"
        :value="modelValue"
        @input="
          emit('update:modelValue', ($event.target as HTMLInputElement).value)
        "
      /><IconButton
        v-if="modelValue"
        label="Clear search"
        size="small"
        @click="clearSearch"
        ><X :size="14"
      /></IconButton>
    </div>
  </section>
</template>
