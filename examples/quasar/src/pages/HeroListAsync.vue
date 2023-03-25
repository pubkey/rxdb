<template>
  <q-page class="row items-center justify-evenly">
    <q-table
      title="Treats"
      class="phl__table"
      :rows="heroes"
      :loading="loading"
      :columns="columns"
      row-key="name"
    >
      <template v-slot:top>
        <q-btn
          :to="{ name: 'hero-create' }"
          class="phl__create"
          label="Create"
          icon="add"
          color="primary"
        ></q-btn>
      </template>
      <template v-slot:body-cell-actions="props">
        <q-td :data-slug="props.row.slug" :props="props" class="phl__actions q-gutter-x-sm">
          <q-btn
            :to="{ name: 'hero-edit', params: { id: props.value } }"
            round
            icon="edit"
            class="phl__edit"
            color="primary"
          ></q-btn>
          <q-btn
            round
            icon="delete"
            color="negative"
            class="phl__remove"
            @click="remove(props.row)"
          ></q-btn>
        </q-td>
      </template>
    </q-table>
    <router-view />
  </q-page>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';
import { preFetch } from 'quasar/wrappers';
import { useHeroListStore } from 'src/stores/hero/list';

export default defineComponent({
  preFetch: preFetch(({ store }) => {
    const heroStore = useHeroListStore(store);
    return heroStore.fetch();
  }),
});
</script>

<script setup lang="ts">
import { onScopeDispose } from 'vue';
import { storeToRefs } from 'pinia';

const heroStore = useHeroListStore();
const { loading, heroes } = storeToRefs(heroStore);
const { remove } = heroStore;

const columns = computed(() => heroStore.columns);

onScopeDispose(async () => {
  heroStore.dispose();
});
await heroStore.fetch();
</script>
