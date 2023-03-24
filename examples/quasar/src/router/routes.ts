import { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        redirect: '/heroes',
      },
      {
        path: 'heroes',
        name: 'hero-list',
        component: () => import('pages/HeroListPage.vue'),
        children: [
          {
            path: 'create',
            name: 'hero-create',
            component: () => import('pages/HeroCreatePage.vue'),
          },
          {
            path: ':id',
            name: 'hero-edit',
            component: () => import('src/pages/HeroEditPage.vue'),
            props: true,
          },
        ],
      },
    ],
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
];

export default routes;
