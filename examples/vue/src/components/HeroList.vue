<template>
  <div class="hero-list">
    <ul v-if="!loading">
      <li v-for="hero in heroes" :key="hero.name">
        <div class="color-box" v-bind:style="{ backgroundColor: hero.color }"></div>
        <span class="hero-name">{{ hero.name }}</span>
        <div class="life">
          <div class="currentPercent" v-bind:style="{ width: hero.hpPercent() +'%' }"></div>
        </div>
        <div class="actions">
          <i class="fa fa-pencil-square-o" aria-hidden="true" v-on:click="editHero(hero)"></i>
          <i class="fa fa-trash-o" aria-hidden="true" v-on:click="removeHero(hero)"></i>
        </div>
      </li>
    </ul>
    <span v-else>Loading..</span>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import DatabaseService from '../services/Database.service';
import { RxHeroDocument, RxHeroesDatabase } from '../RxDB';
import { filter, first, map, debounce, startWith, tap } from 'rxjs/operators';
import { timer, Subscription } from 'rxjs';

@Component({})
export default class HeroList extends Vue {
  private loading: boolean = false;
  private heroes: RxHeroDocument[] = [];
  private sub: Subscription | null = null;

  public async mounted() {
    const db = await DatabaseService.get();
    this.sub = db.heroes
      .find({
        selector: {},
        sort: [{ name: 'asc' }]
      })
      .$.pipe(
        tap(() => {
          // debounce to simulate slow load
          setTimeout(() => (this.loading = false), 1000);
        })
      )
      .subscribe((heroes: RxHeroDocument[]) => {
        this.heroes = heroes;
      });
  }

  public beforeDestroy() {
    if (this.sub) {
      this.sub.unsubscribe();
    }
  }

  private removeHero(hero: RxHeroDocument) {
    hero.remove();
  }
  private editHero(hero: RxHeroDocument) {
    this.$emit('edit', hero);
  }
}
</script>


<style scoped lang="less">
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
