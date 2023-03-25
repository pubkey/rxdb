import { computed, ref } from 'vue';
import { RxHeroDocument } from 'src/types/hero';
import { tap } from 'rxjs/operators';
import { QTableColumn } from 'quasar';
import { defineStore } from 'pinia';
import { Subscription } from 'rxjs';
import { useHeroesApi } from 'src/boot/feathers';

export type HeroListStore = ReturnType<typeof useHeroListStore>;
export const useHeroListStore = defineStore('hero-list', () => {
  const loading = ref(false);
  const heroes = ref<RxHeroDocument[]>();
  const api = useHeroesApi();

  const columns = computed(
    () =>
      [
        {
          name: 'name',
          field: 'name',
          label: 'Name',
          align: 'left',
          sortable: true,
        },
        {
          name: 'color',
          field: 'color',
          label: 'Color',
          align: 'center',
          sortable: true,
        },
        {
          name: 'hp',
          field: 'hp',
          label: 'HP',
          align: 'right',
          sortable: true,
        },
        {
          name: 'maxHP',
          field: 'maxHP',
          label: 'Max HP',
          align: 'right',
          sortable: true,
        },
        { name: 'actions', field: 'id', align: 'center' },
      ] as QTableColumn[]
  );

  let subscription: Subscription;
  async function fetch(this: HeroListStore) {
    if (process.env.SERVER) {
      const { data } = await api.find();
      heroes.value = data as never;
    }

    if (process.env.CLIENT) {
      const query = this.database.heroes.find({
        selector: {},
        sort: [{ name: 'asc' }],
      });

      subscription = query.$.pipe(
        tap(() => {
          setTimeout(() => (loading.value = false), 1000);
        })
      ).subscribe((result: RxHeroDocument[]) => {
        heroes.value = result;
      });
    }
  }

  function remove(hero: RxHeroDocument) {
    hero.remove();
  }

  function dispose(this: HeroListStore) {
    if (subscription) {
      subscription.unsubscribe();
    }
    this.$dispose;
  }

  return {
    loading,
    columns,
    heroes,
    fetch,
    dispose,
    remove,
  };
});
