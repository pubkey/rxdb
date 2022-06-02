import { createApp } from 'vue';
import { createDatabase } from './database';
import router from './router';
import App from './App.vue';
import './registerServiceWorker';

const database = createDatabase();
const app = createApp(App)
  .use(router);

database.then(db => {
  app.use(db).mount('#app');
});


