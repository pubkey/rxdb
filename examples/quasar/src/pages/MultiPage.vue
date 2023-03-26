<template>
  <suspense>
    <q-no-ssr>
      <multi-async v-bind="props" />
    </q-no-ssr>
    <template #fallback> Loading... </template>
  </suspense>
</template>

<script setup lang="ts">
import MultiAsync from './MultiAsync.vue';

interface HeroEditPageProps {
  count: string;
  paths: string[];
}

const props = defineProps<HeroEditPageProps>();
</script>
