<template>
  <div class="page">
    <heroes-list></heroes-list>
    <insert></insert>
  </div>
</template>

<script>
import HeroInsert from 'components/hero-insert';
import HeroesList from 'components/heroes-list';


export default {
  components: {
    HeroInsert,
    HeroesList
  }
}
</script>
