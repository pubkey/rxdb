import Vue from 'vue';
import HeroesList from './components/heroes-list.vue';
import HeroInsert from './components/hero-insert.vue';
import App from './App.vue';

new Vue({
    el: '#app',
    render: h => h(App)
});
