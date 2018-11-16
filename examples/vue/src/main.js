import Vue from 'vue';
import VueRx from 'vue-rx';
Vue.use(VueRx);

import App from './App.vue';
import 'rxjs';

import * as Database from './database/Database.js';

Promise.all([
    // load things before vue startup
    Database.init()
]).then((
) => {
    return new Vue({
        el: '#app',
        render: h => h(App)
    });
});
