<script setup lang="ts">
defineProps<{ modelValue: string }>();
defineEmits<{ 'update:modelValue': [value: string] }>();
</script>

<template>
  <section class="editor-title-block">
    <input class="editor-title-input" aria-label="Note title" :value="modelValue" @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)" />
    <div class="editor-state"><span class="editor-state-dot" aria-hidden="true" />Editing</div>
  </section>
</template>
