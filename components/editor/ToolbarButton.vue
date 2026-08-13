<script setup lang="ts">
withDefaults(defineProps<{ label: string; active?: boolean; disabled?: boolean; tone?: 'light' | 'dark' }>(), {
  active: false,
  disabled: false,
  tone: 'light',
});
defineEmits<{ activate: [] }>();
</script>

<template>
  <button
    type="button"
    class="toolbar-button"
    :class="[`toolbar-button--${tone}`, { 'is-active': active }]"
    :aria-label="label"
    :title="label"
    :aria-pressed="active"
    :disabled="disabled"
    @mousedown.prevent
    @click="$emit('activate')"
  >
    <slot />
  </button>
</template>
