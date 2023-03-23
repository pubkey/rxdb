import { ref } from 'vue';
import { RxHeroDocument } from 'src/types/hero';
import { defineStore } from 'pinia';
import { Subscription } from 'rxjs';

export type HeroEditStore = ReturnType<typeof useHeroEditStore>;
export const useHeroEditStore = defineStore('hero-edit', () => {
  const hero = ref<RxHeroDocument>();
  const hp = ref(0);
  const deleted = ref(false);
  const synced = ref(true);

  let subscription: Subscription;
  async function fetch(this: HeroEditStore, slug: string) {
    if (process.env.CLIENT) {
      const data = await this.database.heroes.findOne(slug).exec();
      hero.value = data as RxHeroDocument;
      hp.value = hero.value.hp;
  
      subscription = hero.value.$.subscribe((_hero) => {
        hero.value = _hero;
        synced.value = _hero.hp === hp.value;
        deleted.value = _hero.deleted;
      });
    }
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
