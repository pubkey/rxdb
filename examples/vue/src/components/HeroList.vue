<template>
  <div class="hero-list">
    <ul v-if="!loading">
      <li v-for="hero in heroes" :key="hero.name">
        <div class="color-box" :style="{ 'background-color': hero.color }"></div>
        <span class="hero-name">{{ hero.name }}</span>
        <div class="life">
          <div class="currentPercent" :style="{ width: hero.hpPercent() +'%' }"></div>
        </div>
        <div class="actions">
          <i class="fa fa-pencil-square-o" aria-hidden="true" @click="onEditHeroClick(hero)"></i>
          <i class="fa fa-trash-o" aria-hidden="true" @click="onRemoveHeroClick(hero)"></i>
        </div>
      </li>
    </ul>
    <span v-else>Loading...</span>
  </div>
</template>

<script lang="ts">
import { RxHeroDocument } from '@/RxDB';
import { tap } from 'rxjs/operators';
import { defineComponent, onUnmounted, ref } from 'vue';
import { useDatabase } from '../database';

export default defineComponent({
  name: 'HeroList',
  emits: [
    'edit'
  ],
  setup(props, { emit }) {
    const loading = ref<boolean>(false);
    const heroes = ref<any[]>([]);
    const database = useDatabase();
    const sub = database.heroes
      .find({
        selector: {},
        sort: [{ name: 'asc' }]
      })
      .$.pipe(
        tap(() => {
          // debounce to simulate slow load
          setTimeout(() => (loading.value = false), 1000);
        })
      )
      .subscribe((result: RxHeroDocument[]) => {
        heroes.value = result;
      });

    onUnmounted(() => {
      if (sub) {
        sub.unsubscribe();
      }
    });

    const onEditHeroClick = (hero: RxHeroDocument) => {
      emit('edit', hero);
    };

    const onRemoveHeroClick = (hero: RxHeroDocument) => {
      hero.remove();
    };

    return {
      loading,
      heroes,
      onEditHeroClick,
      onRemoveHeroClick
    };
  }
});
</script>


<style scoped lang="scss">
ul {
  list-style: none;
  padding: 0 16px;
  display: inline-block;
  position: relative;
  width: 100%;
}

ul li {
  width: 100%;
  float: left;
  margin-top: 6px;
  margin-bottom: 6px;
}

.color-box {
  width: 20px;
  height: 20px;
  float: left;
  margin-right: 11px;
  border-radius: 2px;
  border-width: 1px;
  border-style: solid;
  border-color: grey;
}

.life {
  width: 85%;
  height: 2px;
  background-color: red;
  float: left;
  position: absolute;
  margin-left: 4%;
  left: 10px;
}

.life .currentPercent {
  height: 100%;
  background-color: green;
}

.actions {
  float: right;
}

.actions i {
  cursor: pointer;
}
</style>
