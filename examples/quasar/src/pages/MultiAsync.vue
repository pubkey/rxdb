<template>
  <q-page>
    <div class="flex flex-center q-pa-sm" v-for="index in _count" :key="index">
      <q-card class="pma__card full-width" flat aquare>
        <iframe
          class="pma__frame full-width"
          :src="url"
          frameborder="0"
        ></iframe>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface HeroEditPageProps {
  count: string;
  paths: string[];
}

const props = defineProps<HeroEditPageProps>();
const _count = computed(() => parseInt(props.count));
const url = computed(() => `/${props.paths.join('/')}`);
</script>

<style lang="scss">
.pma__card {
  max-width: 1204px;
  border: $primary 1px solid;
}
.pma__frame {
  min-height: 540px;
}
</style>
