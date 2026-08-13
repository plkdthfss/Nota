<script setup lang="ts">
defineProps<{ count: number }>();
</script>
<template>
  <div class="result-header">
    <span>{{ count }} results</span><span>in all folders</span>
  </div>
</template>
