<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'App'
});
</script>

<style lang="scss">
body,
html {
  margin: 0;
  padding: 0;
  font-family: Roboto;
  background: #ebeff1;
}

#insert-box,
#list-box,
h1 {
  width: 86%;
  padding: 3%;
  margin-left: auto;
  margin-right: auto;
}

.box {
  box-shadow: 0px 3px 1px -2px rgba(0, 0, 0, 0.2),
    0px 2px 2px 0px rgba(0, 0, 0, 0.14), 0px 1px 5px 0px rgba(0, 0, 0, 0.12);
  margin-bottom: 20px;
  background: white;
}
#insert-box h3,
#insert-box input,
#insert-box button {
  width: 100%;
}

.box h3 {
  margin-top: 0;
}

h1 {
  display: block;
  font-size: 1.17em;
  -webkit-margin-before: 1em;
  -webkit-margin-after: 1em;
  -webkit-margin-start: 0px;
  -webkit-margin-end: 0px;
  font-weight: bold;
  margin: 0 auto;
  padding: 3%;
  width: 92%;
}
h3 {
  font-size: 14px;
  color: rgba(0, 0, 0, 0.54);
}

ul,
li {
  list-style-type: none;
  padding: 0;
}
</style>
