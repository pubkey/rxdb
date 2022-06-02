<template>
  <div class="home">
    <h1>RxDB - vuejs</h1>
    <HeroEdit v-if="edit" v-model:hero="edit" @cancel="edit=null" @submit="edit=null"></HeroEdit>
    <div id="list-box" class="box">
      <h3>Heroes</h3>
      <HeroList @edit="onEditHero"></HeroList>
    </div>
    <div id="insert-box" class="box">
      <HeroInsert></HeroInsert>
    </div>
  </div>
</template>

<script lang="ts">

import { RxHeroDocument } from '@/RxDB';
import HeroList from '@/components/HeroList.vue';
import HeroInsert from '@/components/HeroInsert.vue';
import HeroEdit from '@/components/HeroEdit.vue';
import { defineComponent, ref } from 'vue';


export default defineComponent({
  name: 'Home',
  components: {
    HeroList,
    HeroInsert,
    HeroEdit
  },
  setup() {
    const edit = ref<any>(null);

    const onEditHero = (hero: RxHeroDocument) => {
      edit.value = hero;
    };

    return {
      edit,
      onEditHero
    };
  }
});
</script>
