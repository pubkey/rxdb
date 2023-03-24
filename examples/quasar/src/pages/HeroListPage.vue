<template>
  <suspense>
    <hero-list-async />
    <template #fallback>
      Loading...
    </template>
  </suspense>
</template>

<script setup lang="ts">
import HeroListAsync from './HeroListAsync.vue'
</script>
