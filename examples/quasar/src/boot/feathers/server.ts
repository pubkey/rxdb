import { boot } from 'quasar/wrappers';
import { feathers } from '@feathersjs/feathers';
import { configureApp } from '.';
import { setup } from 'app/src-ssr/api/heroes';
import type { ServiceTypes } from 'app/src-ssr/api/index';

export default boot(async (ctx) => {
  const api = feathers<ServiceTypes>();
  api.configure(setup);

  configureApp(ctx, api);
});
