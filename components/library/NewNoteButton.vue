<script setup lang="ts">
import { Plus } from "@lucide/vue";
defineEmits<{ create: [] }>();
</script>
<template>
  <button
    type="button"
    class="fab"
    aria-label="New note"
    title="New note"
    @click="$emit('create')"
  >
    <Plus :size="18" />
  </button>
</template>
