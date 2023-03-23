import { ref } from 'vue';
import { RxHeroDocumentType } from 'src/types/hero';
import { defineStore } from 'pinia';
import { Subscription } from 'rxjs';
import { faker } from '@faker-js/faker';
import { comb } from 'src/utils/uuid';

export type HeroCreateStore = ReturnType<typeof useHeroCreateStore>;
export const useHeroCreateStore = defineStore('hero-create', () => {
  const hero = ref<Partial<RxHeroDocumentType>>({});

  let subscription: Subscription;
  async function save(this: HeroCreateStore) {
    const name = hero.value.name || '';
    const slug = faker.helpers.slugify(name).toLocaleLowerCase();
    const obj: RxHeroDocumentType = {
      id: comb(),
      name: name,
      slug: slug,
      color: hero.value.color || '',
      hp: 100,
      maxHP: faker.datatype.number({ min: 100, max: 1000 })
    };
    return this.database.heroes.insert(obj);
  }

  function dispose(this: HeroCreateStore) {
    if (subscription) {
      subscription.unsubscribe();
    }
    return this.$dispose();
  }

  return {
    hero,
    save,
    dispose,
  };
});
