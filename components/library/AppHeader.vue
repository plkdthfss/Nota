<script setup lang="ts">
import { Moon, Sun } from "@lucide/vue";
import IconButton from "../common/IconButton.vue";

const props = defineProps<{ theme: "light" | "dark" }>();
const emit = defineEmits<{ toggleTheme: [] }>();

const targetLabel = props.theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
</script>
<template>
  <header class="app-header">
    <span class="app-mark" aria-hidden="true" />
    <h1 class="app-title">Nota</h1>
    <div class="header-actions">
      <IconButton
        :label="targetLabel"
        :title="targetLabel"
        @click="$emit('toggleTheme')"
      >
        <Sun v-if="theme === 'dark'" :size="16" aria-hidden="true" />
        <Moon v-else :size="16" aria-hidden="true" />
      </IconButton>
    </div>
  </header>
</template>
