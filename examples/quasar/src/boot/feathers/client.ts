import { boot } from 'quasar/wrappers';
import { feathers } from '@feathersjs/feathers';
import rest from '@feathersjs/rest-client';
import axios from 'axios';
import { configureApp } from '.';
import type { ServiceTypes } from 'app/src-api/index';

export default boot(async (ctx) => {
  const apiClient = axios.create({ baseURL: '/' });
  const restClient = rest();
  const services = restClient.axios(apiClient);

  const api = feathers<ServiceTypes>();
  api.configure(services);

  configureApp(ctx, api);
});
