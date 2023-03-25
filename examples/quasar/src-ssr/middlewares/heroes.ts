import { Application } from 'app/src-api';
import { migrate, seed, setup } from 'app/src-api/heroes';
import { ssrMiddleware } from 'quasar/wrappers';

// "async" is optional;
// more info on params: https://v2.quasar.dev/quasar-cli/developing-ssr/ssr-middlewares
export default ssrMiddleware(async ({ app }) => {
  const _app = app as never as Application;
  await migrate();
  _app.configure(setup);
  await seed(_app);
});
