<script setup lang="ts">
withDefaults(
  defineProps<{ label: string; title?: string; size?: "small" | "medium" }>(),
  { title: undefined, size: "medium" },
);
</script>

<template>
  <button
    type="button"
    class="icon-button"
    :class="`icon-button--${size}`"
    :aria-label="label"
    :title="title ?? label"
  >
    <slot />
  </button>
</template>