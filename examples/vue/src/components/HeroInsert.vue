<template>
  <div class="insert">
    <form v-on:submit.prevent="onSubmit" name="insertForm">
      <input v-model="name" autocomplete="off" type="text" name="name" placeholder="Name">
      <br>
      <input v-model="color" autocomplete="off" type="text" name="color" placeholder="Color">
      <br>
      <button>Submit</button>
    </form>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import randomInt from 'random-int';
import DatabaseService from '../services/Database.service';
import { RxHeroDocument, RxHeroesDatabase } from '../RxDB';


@Component({})
export default class HeroInsert extends Vue {
  private name: string = '';
  private color: string = '';

  public async onSubmit() {
    console.log('OnSubmit');
    console.dir(this);
    const db: RxHeroesDatabase = await DatabaseService.get();
    const obj = {
      name: this.name,
      color: this.color,
      hp: 100,
      maxHP: randomInt(100, 1000),
      skills: []
    };
    console.dir(obj);
    await db.heroes.insert(obj);
    console.log('Inserted new hero: ' + this.name);

    this.name = '';
    this.color = '';
  }
}
</script>


<style scoped lang="less">
input {
  font-size: 16px;
  font-weight: lighter;
  border: 0;
  border-bottom: 1px solid #999;
  margin-bottom: 20px;
  padding-bottom: 7px;
}
input:focus {
  outline: none;
}
button {
  background-color: #009688;
  outline: none;
  border: none;
  color: white;
  font-size: 16px;
  border-radius: 4px;
  padding: 1.5%;
  cursor: pointer;
  box-shadow: 0px 3px 1px -2px rgba(0, 0, 0, 0.2),
    0px 2px 2px 0px rgba(0, 0, 0, 0.14), 0px 1px 5px 0px rgba(0, 0, 0, 0.12);
}
</style>
