<script setup lang="ts">
defineProps<{ wordCount: number }>();
</script>
<template>
  <footer class="editor-status">
    <span>{{ wordCount }} words</span><span>Editing</span>
  </footer>
</template>