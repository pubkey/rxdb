import { boot } from 'quasar/wrappers';
import { syncHeroes } from 'src/database';
import { App, InjectionKey } from 'vue';
import { databaseKey } from './database';
import { heroesApiKey } from './feathers';

function inject<T>(key: InjectionKey<T>, app: App<unknown>): T {
  return app._context.provides[key as never] as T;
}

export default boot(async ({ app }) => {
  const heroesApi = inject(heroesApiKey, app);
  const database = inject(databaseKey, app);

  syncHeroes(database, heroesApi);
});
