<script setup lang="ts">
import { MoreHorizontal, Search } from "@lucide/vue";
import IconButton from "../common/IconButton.vue";
defineEmits<{ search: [] }>();
</script>
<template>
  <header class="app-header">
    <span class="app-mark" aria-hidden="true" />
    <h1 class="app-title">SideNote</h1>
    <div class="header-actions">
      <IconButton label="Search notes" @click="$emit('search')"
        ><Search :size="16" /></IconButton
      ><IconButton label="More options"
        ><MoreHorizontal :size="16"
      /></IconButton>
    </div>
  </header>
</template>
