import { ref } from 'vue';
import { RxHeroDocument } from 'src/types/hero';
import { defineStore } from 'pinia';
import { Subscription } from 'rxjs';
import { useHeroesApi } from 'src/boot/feathers';

export type HeroEditStore = ReturnType<typeof useHeroEditStore>;
export const useHeroEditStore = defineStore('hero-edit', () => {
  const hero = ref<RxHeroDocument>();
  const hp = ref(0);
  const deleted = ref(false);
  const synced = ref(true);
  const api = useHeroesApi()

  let subscription: Subscription;

  async function fetch(this: HeroEditStore, id: string) {
    const data = await api.get(id);
    hero.value = data as never;
    hp.value = data.hp;
    /*
    if (process.env.SERVER) {
      const data = await api.get(id);
      hero.value = data as never;
      hp.value = data.hp;
    }

    if (process.env.CLIENT) {
      const data = await this.database.heroes.findOne(id).exec();
      hero.value = data as RxHeroDocument;
      hp.value = hero.value.hp;

      subscription = hero.value.$.subscribe((_hero) => {
        hero.value = _hero;
        synced.value = _hero.hp === hp.value;
        deleted.value = _hero.deleted;
      });
    }
    */
  }

  function resync() {
    hp.value = hero.value?.hp || 0;
    synced.value = true;
  }

  function save() {
    return hero.value?.incrementalPatch({ hp: parseInt(hp.value + '') });
  }

  function dispose(this: HeroEditStore) {
    if (subscription) {
      subscription.unsubscribe();
    }
    return this.$dispose();
  }

  return {
    hero,
    hp,
    deleted,
    synced,
    fetch,
    dispose,
    resync,
    save,
  };
});
