<template>
  <div class="home">
    <h1>RxDB - vuejs</h1>
    <HeroEdit v-if="edit" v-bind:hero="edit" v-on:cancel="edit=null" v-on:submit="edit=null"></HeroEdit>
    <div id="list-box" class="box">
      <h3>Heroes</h3>
      <HeroList v-on:edit="editHero"></HeroList>
    </div>
    <div id="insert-box" class="box">
      <HeroInsert></HeroInsert>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import { RxHeroDocument } from '@/RxDB';

import HeroList from '@/components/HeroList.vue';
import HeroInsert from '@/components/HeroInsert.vue';
import HeroEdit from '@/components/HeroEdit.vue';

@Component({
  components: {
    HeroList,
    HeroInsert,
    HeroEdit
  }
})
export default class Home extends Vue {
  private edit: RxHeroDocument | null = null;

  private editHero(hero: RxHeroDocument) {
    this.edit = hero;
  }
}
</script>
