<template>
  <div class="insert">
    <form @submit.prevent="onFormSubmit" name="insertForm">
      <input v-model="hero.name" autocomplete="off" type="text" name="name" placeholder="Name">
      <br>
      <input v-model="hero.color" autocomplete="off" type="text" name="color" placeholder="Color">
      <br>
      <button>Submit</button>
    </form>
  </div>
</template>

<script lang="ts">
import randomInt from 'random-int';
import { defineComponent, ref } from 'vue';
import { useDatabase } from '@/database';

export default defineComponent({
  name: 'HeroInsert',
  setup() {
    const hero = ref<any>({});
    const database = useDatabase();

    const onFormSubmit = async() => {
      console.log('OnSubmit');

      const obj = {
        name: hero.value.name,
        color: hero.value.color,
        hp: 100,
        maxHP: randomInt(100, 1000),
        skills: []
      };
      console.dir(obj);
      await database.heroes.insert(obj);
      console.log('Inserted new hero: ' + hero.value.name);

      hero.value = {};
    };

    return {
      hero,
      onFormSubmit
    };
  }
});
</script>


<style scoped lang="scss">
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
