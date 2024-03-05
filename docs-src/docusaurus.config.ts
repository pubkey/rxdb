// @ts-check
// `@type` JSDoc annotations allow editor autocompletion and type checking
// (when paired with `@ts-check`).
// There are various equivalent ways to declare your Docusaurus config.
// See: https://docusaurus.io/docs/api/docusaurus-config

import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';

/** @type {import('@docusaurus/types').Config} */
const config: Config = {
  title: 'RxDB - JavaScript Database',
  tagline: 'Realtime JavaScript Database',
  favicon: 'img/favicon.ico',

  // Set the production url of your site here
  url: 'https://rxdb.info',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'pubkey', // Usually your GitHub org/user name.
  projectName: 'rxdb', // Usually your repo name.

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },
  plugins: [['./docusaurus-lunr-search-main/src/', {
    excludeRoutes: ['blog', 'releases']
  }]],

  scripts: [
    // {
    //   id: 'CookieDeclaration',
    //   src: 'https://consent.cookiebot.com/c429ebbd-6e92-4150-b700-ca186e06bc7c/cd.js',
    //   type: 'text/javascript'
    // }
    {
      id: 'Cookiebot',
      src: 'https://consent.cookiebot.com/uc.js?cbid=c429ebbd-6e92-4150-b700-ca186e06bc7c',
      'data-cbid': 'c429ebbd-6e92-4150-b700-ca186e06bc7c',
      'data-blockingmode': 'auto',
      type: 'text/javascript'
    },
    {
      src: '/js/analytics.js',
      async: true,
    },
    // {
    //   src: 'https://www.googletagmanager.com/gtag/js?id=G-62D63SY3S0',
    //   async: true,
    // },
  ],

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        gtag: {
          trackingID: 'G-62D63SY3S0',
          anonymizeIP: false,
        },
        googleTagManager: {
          containerId: 'GTM-PL63TR5',
        },
        docs: {
          sidebarPath: './sidebars.js',
          routeBasePath: '',
          path: './docs',
          // I disabled the editUrl because it just confuses users and does not look professional
          // editUrl: 'https://github.com/pubkey/rxdb/tree/master/docs-src/',
        },
        // blog: {
        //   showReadingTime: true,
        //   editUrl:
        //     'https://github.com/pubkey/rxdb/tree/master/docs/',
        // },
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ]
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({

      // Replace with your project's social card
      image: 'img/rxdb_social_card.png',
      colorMode: {
        defaultMode: 'dark',
        disableSwitch: true,
        respectPrefersColorScheme: false,
      },
      navbar: {
        title: 'RxDB',
        logo: {
          alt: 'RxDB Logo',
          src: 'files/logo/logo.svg',
        },
        items: [
          // {
          //   type: 'docSidebar',
          //   sidebarId: 'tutorialSidebar',
          //   position: 'left',
          //   label: 'Tutorial',
          // },
          // { to: '/blog', label: 'Blog', position: 'left' },
          {
            href: '/quickstart.html',
            label: 'Docs',
            position: 'right',
          },
          {
            href: '/code',
            target: '_blank',
            label: 'Code',
            position: 'right',
          },
          {
            href: '/premium',
            label: 'Pricing',
            position: 'right',
          },
          {
            to: '/chat',
            target: '_blank',
            label: 'Chat',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Docs',
            items: [
              {
                label: '🚀 Quickstart',
                to: '/quickstart.html',
              },
              {
                label: '💾 Storage',
                to: '/rx-storage.html',
              },
              {
                label: '🔄 Replication',
                to: '/replication.html',
              },
            ],
          },
          {
            title: 'Community',
            items: [
              {
                label: 'Github',
                target: '_blank',
                href: '/code',
              },
              {
                label: 'Discord',
                target: '_blank',
                href: '/chat',
              },
              {
                label: 'Twitter',
                href: 'https://twitter.com/intent/user?screen_name=rxdbjs',
              },
              {
                label: 'LinkedIn',
                href: 'https://www.linkedin.com/company/rxdb',
              },
              {
                label: 'Stack Overflow',
                href: 'https://stackoverflow.com/questions/tagged/rxdb',
              },
            ],
          },
          {
            title: 'More',
            items: [
              {
                label: 'Pricing',
                target: '_blank',
                href: '/premium'
              },
              {
                label: 'Legal Notice',
                target: '_blank',
                href: '/legal-notice',
              },
            ],
          },
        ],
        copyright: ' ',
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
      },
    }),
};

export default config;
