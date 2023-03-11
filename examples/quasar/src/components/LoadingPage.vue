<template>
  <q-dialog class="row flex flex-center pload">
    <q-card>
      <q-card-section class="text-center">
        <span class="text-h5 text-uppercase">{{ message }}</span>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
interface LoadingPageProps {
  message?: string;
}

withDefaults(defineProps<LoadingPageProps>(), {
  message: 'Loading...',
});
</script>
