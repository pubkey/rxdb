// @ts-check
// `@type` JSDoc annotations allow editor autocompletion and type checking
// (when paired with `@ts-check`).
// There are various equivalent ways to declare your Docusaurus config.
// See: https://docusaurus.io/docs/api/docusaurus-config

import type { Config } from '@docusaurus/types';
import rehypeShiki from '@shikijs/rehype';

/** @type {import('@docusaurus/types').Config} */
const config: Config = {
    title: 'RxDB - JavaScript Database',
    tagline: 'Realtime JavaScript Database',
    favicon: '/img/favicon.png',
    // Add multiple sizes + Apple touch icon (+ optional SVG)
    headTags: [
        { tagName: 'link', attributes: { rel: 'icon', type: 'image/svg+xml', href: '/files/logo/logo.svg' } },
        { tagName: 'link', attributes: { rel: 'apple-touch-icon', href: '/img/apple-touch-icon.png', sizes: '180x180' } },
        { tagName: 'link', attributes: { rel: 'preconnect', href: 'https://consentcdn.cookiebot.com/' } },
        { tagName: 'link', attributes: { rel: 'preconnect', href: 'https://consent.cookiebot.com/' } },
        { tagName: 'link', attributes: { rel: 'preconnect', href: 'https://region1.analytics.google.com/' } },
        { tagName: 'link', attributes: { rel: 'preconnect', href: 'https://www.redditstatic.com/' } },
        { tagName: 'link', attributes: { rel: 'preconnect', href: 'https://pixel-config.reddit.com/' } },
    ],

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
    onBrokenMarkdownLinks: 'throw',

    // Even if you don't use internationalization, you can use this field to set
    // useful metadata like html lang. For example, if your site is Chinese, you
    // may want to replace "en" with "zh-Hans".
    i18n: {
        defaultLocale: 'en',
        locales: ['en'],
    },
    plugins: [
        [
            './docusaurus-lunr-search-main/src/',
            {
                excludeRoutes: ['blog', 'releases'],
            },
        ],
        function myWebpackTweaks() {
            return {
                name: 'custom-webpack-tweaks',
                configureWebpack(_config, _isServer, _utils) {
                    return {
                        module: {
                            /**
                             * Disable file hashing of fonts so we can
                             * use html-preload on them.
                             */
                            rules: [
                                {
                                    test: /\.(woff(2)?|ttf|eot|otf)$/,
                                    type: 'asset/resource',
                                    generator: {
                                        // Remove hash from font filenames
                                        filename: 'static/fonts/[name][ext]',
                                    },
                                },
                            ],
                        },
                    };
                },
            };
        },
    ],
    scripts: [
        // {
        //   id: 'CookieDeclaration',
        //   src: 'https://consent.cookiebot.com/c429ebbd-6e92-4150-b700-ca186e06bc7c/cd.js',
        //   type: 'text/javascript'
        // }

        // already included via google tag manager
        // {
        //   id: 'Cookiebot',
        //   src: 'https://consent.cookiebot.com/uc.js?cbid=c429ebbd-6e92-4150-b700-ca186e06bc7c',
        //   'data-cbid': 'c429ebbd-6e92-4150-b700-ca186e06bc7c',
        //   'data-blockingmode': 'auto',
        //   type: 'text/javascript',
        //   async: true
        // },
        /*
         * Pipedrive embedded chat.
         * Disabled because people should fill out the premium form
         * and ask questions there so that we have more meta info.
         */
        // {
        //   src: 'https://leadbooster-chat.pipedrive.com/assets/loader.js',
        //   type: 'text/javascript',
        //   async: true
        // }
        // {
        //   src: 'https://www.googletagmanager.com/gtag/js?id=G-62D63SY3S0',
        //   async: true,
        // },
    ],

    presets: [
        [
            'classic',
            /** @type {import('@docusaurus/preset-classic').Options} */
            {
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
                    breadcrumbs: false,
                    // I disabled the editUrl because it just confuses users and does not look professional
                    // editUrl: 'https://github.com/pubkey/rxdb/tree/master/docs-src/',
                    rehypePlugins: [
                        [
                            rehypeShiki,
                            {
                                themes: {
                                    light: 'dracula',
                                    dark: 'dracula',
                                },
                                langs: [
                                    'javascript',
                                    'typescript',
                                    'json',
                                    'bash',
                                    'graphql',
                                    'html',
                                    'css',
                                    'jsx',
                                    'tsx',
                                ],
                            },
                        ],
                    ],
                },
                // blog: {
                //   showReadingTime: true,
                //   editUrl:
                //     'https://github.com/pubkey/rxdb/tree/master/docs/',
                // },
                theme: {
                    customCss: './src/css/custom.css',
                },
            },
        ],
    ],

    themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    {
        // Replace with your project's social card
        image: 'img/rxdb_social_card.png',
        colorMode: {
            defaultMode: 'dark',
            disableSwitch: true,
            respectPrefersColorScheme: false,
        },
        navbar: {
            title: '',
            logo: {
                alt: 'RxDB',
                src: 'files/logo/logo_text_white.svg',
            },
            items: [
                {
                    href: '/overview.html',
                    label: 'Docs',
                    position: 'left',
                },
                {
                    href: '/replication.html',
                    label: 'Sync',
                    position: 'left',
                },
                {
                    href: '/rx-storage.html',
                    label: 'Storages',
                    position: 'left',
                },

                {
                    href: '/premium/',
                    label: 'Premium',
                    position: 'left',
                },
                {
                    href: '/consulting/',
                    label: 'Support',
                    position: 'left',
                },
                {
                    to: '/chat/',
                    target: '_blank',
                    label: ' ',
                    position: 'right',
                    className: 'navbar-icon navbar__item navbar-icon-discord'
                },
                {
                    to: '/code/',
                    target: '_blank',
                    label: ' ',
                    position: 'right',
                    className: 'navbar-icon navbar__item navbar-icon-github'
                },
                // {
                //     to: '/chat',
                //     target: '_blank',
                //     label: 'Community',
                //     position: 'right',
                //     className: 'navbar-icon-discord'
                // },
                // {
                //   href: '/code/',
                //   target: '_blank',
                //   label: 'Code',
                //   position: 'right',
                // },
            ],
        },
        footer: {
            style: 'dark',
            links: [],
            copyright: ' ',
        },
    },
};

export default config;
