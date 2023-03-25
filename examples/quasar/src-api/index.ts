import { feathers } from '@feathersjs/feathers';
import express, { json, urlencoded, rest } from '@feathersjs/express';
import swagger from 'feathers-swagger';
import compression from 'compression';
import helmet from 'helmet';
import { HeroesService } from './heroes';
import type { Application as _App } from '@feathersjs/feathers';

export interface ServiceTypes {
  'api/heroes': HeroesService;
}

export type FeathersApp = _App<ServiceTypes>;
export type Application = ReturnType<typeof createApp>;

export function createApp() {
  const app = express(feathers<ServiceTypes>()).configure(
    swagger({
      idType: 'string',
      ui: swagger.swaggerUI({
        docsPath: '/api/docs',
      }),
      specs: {
        info: {
          title: 'A test',
          description: 'A description',
          version: '1.0.0',
        },
      },
    })
  );

  app.use(
    helmet({
      contentSecurityPolicy: false,
    })
  );
  if (process.env.PROD) {
    app.use(compression());
  }
  app.use(json());
  app.use(urlencoded({ extended: true }));
  app.configure(rest());

  return app;
}
