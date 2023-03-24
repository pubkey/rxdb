import { inject, InjectionKey } from 'vue';
import type { HeroesService } from 'app/src-api/heroes';
import type { FeathersApp } from 'app/src-api/index';
import { BootFileParams } from '@quasar/app-vite';

export const apiKey: InjectionKey<FeathersApp> = Symbol('api-key');
export const heroesApiKey: InjectionKey<HeroesService> =
  Symbol('entity-api-key');

export function useApi () {
  const api = inject(apiKey);
  if (!api) {
    throw 'api not inject'
  }
  return api
}

export function useHeroesApi () {
  const heroesApi = inject(heroesApiKey);
  if (!heroesApi) {
    throw 'heroes api not inject'
  }
  return heroesApi
}

export function configureApp ({ app }: BootFileParams<never>, api: FeathersApp) {
  const heroesApi = api.service('api/heroes');
  app.provide(apiKey, api);
  app.provide(heroesApiKey, heroesApi);
}