<template>
  <q-input v-bind="props">
    <template v-for="(_, slot) in slots" :key="slot" v-slot:[slot]="scope">
      <slot :name="slot" v-bind="scope" :key="slot" />
    </template>
  </q-input>
</template>

<script setup lang="ts">
import { QInputProps, QInputSlots } from 'quasar';
import { useSlots } from 'vue';

interface RxInputProps extends QInputProps {
  filled?: boolean;
  dense?: boolean;
}

const props = withDefaults(defineProps<RxInputProps>(), {
  filled: true,
  dense: true,
});
const slots = useSlots() as never as QInputSlots;
</script>
