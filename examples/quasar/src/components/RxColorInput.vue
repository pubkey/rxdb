<template>
  <q-input v-bind="props" v-model="value">
    <template v-for="(_, slot) in slots" :key="slot" v-slot:[slot]="scope">
      <slot :name="slot" v-bind="scope" :key="slot" />
    </template>
    <template v-slot:append>
      <q-icon name="colorize" class="cursor-pointer">
        <q-popup-proxy cover transition-show="scale" transition-hide="scale">
          <q-color v-model="value" />
        </q-popup-proxy>
      </q-icon>
    </template>
  </q-input>
</template>

<script setup lang="ts">
import { QInputProps, QInputSlots } from 'quasar';
import { discard } from 'src/utils/discard';
import { computed, useSlots } from 'vue';

interface RxInputProps extends QInputProps {
  filled?: boolean;
  dense?: boolean;
}

const emits = defineEmits<{
  (e: 'update:modelValue', val: string): void;
}>();

const props = withDefaults(defineProps<RxInputProps>(), {
  filled: true,
  dense: true,
});
const { append, ...slots } = useSlots() as never as QInputSlots;
discard(append);

const value = computed({
  get() {
    return props.modelValue as string;
  },
  set(val: string) {
    emits('update:modelValue', val);
  },
});
</script>
