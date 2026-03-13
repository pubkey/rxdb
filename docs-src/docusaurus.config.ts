// @ts-check
// `@type` JSDoc annotations allow editor autocompletion and type checking
// (when paired with `@ts-check`).
// There are various equivalent ways to declare your Docusaurus config.
// See: https://docusaurus.io/docs/api/docusaurus-config

import type { Config } from '@docusaurus/types';
import rehypePrettyCode from 'rehype-pretty-code';
import type { Options as RehypePrettyCodeOptions, Theme } from 'rehype-pretty-code';
import { createCssVariablesTheme, ThemeRegistrationAny } from 'shiki';

const rehypePrettyCodeOptions: RehypePrettyCodeOptions = {
    theme: createCssVariablesTheme({
        name: 'css-variables',
        variablePrefix: '--shiki-',
        fontStyle: true,
        // rehype-pretty-code expects "settings" to always be available,
        // but shiki doesn't always provide it.
    }) satisfies ThemeRegistrationAny as Theme,
    bypassInlineCode: true,
};

/** @type {import('@docusaurus/types').Config} */
const config: Config = {
    title: 'RxDB - JavaScript Database',
    tagline: 'Realtime JavaScript Database',
    favicon: '/img/favicon.png',
    // Add multiple sizes + Apple touch icon (+ optional SVG)
    headTags: [
        { tagName: 'meta', attributes: { name: 'theme-color', content: '#ed168f' } },
        { tagName: 'link', attributes: { rel: 'icon', type: 'image/svg+xml', href: '/files/logo/logo.svg' } },
        { tagName: 'link', attributes: { rel: 'apple-touch-icon', href: '/img/apple-touch-icon.png', sizes: '180x180' } },
        { tagName: 'link', attributes: { rel: 'preconnect', href: 'https://consentcdn.cookiebot.com/' } },
        { tagName: 'link', attributes: { rel: 'preconnect', href: 'https://consent.cookiebot.com/' } },
        { tagName: 'link', attributes: { rel: 'preconnect', href: 'https://region1.analytics.google.com/' } },
        { tagName: 'link', attributes: { rel: 'preconnect', href: 'https://www.redditstatic.com/' } },
        { tagName: 'link', attributes: { rel: 'preconnect', href: 'https://pixel-config.reddit.com/' } },
        {
            tagName: 'script',
            attributes: { type: 'application/ld+json' },
            innerHTML: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'SoftwareApplication',
                'name': 'RxDB',
                'applicationCategory': 'DeveloperApplication',
                'operatingSystem': 'Any',
                'description': 'A fast, local-first, reactive NoSQL database for JavaScript applications. Supports offline-first sync, real-time replication, and works across browsers, Node.js, Electron, React Native, and Flutter.',
                'url': 'https://rxdb.info',
                'offers': {
                    '@type': 'Offer',
                    'price': '0',
                    'priceCurrency': 'USD',
                },
                'author': {
                    '@type': 'Organization',
                    'name': 'RxDB',
                    'url': 'https://rxdb.info',
                    'logo': 'https://rxdb.info/files/logo/logo.svg',
                    'sameAs': [
                        'https://github.com/pubkey/rxdb',
                        'https://twitter.com/rxdbjs',
                        'https://www.linkedin.com/company/rxdb',
                    ],
                },
            }),
        },
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
            'docusaurus-plugin-llms',
            {
                generateLLMsTxt: true,
                generateLLMsFullTxt: true,
                docsDir: 'docs',
                /**
                 * Add deprecated stuff here
                 */
                ignoreFiles: [
                    'docs/adapters.md',
                    'docs/rx-storage-lokijs.md'
                ],
                title: 'RxDB Documentation',
                description: 'Authoritative reference documentation for RxDB, a reactive, local-first NoSQL database for JavaScript with offline support and explicit replication.',
                rootContent: `RxDB (Reactive Database) is a local-first, NoSQL database for JavaScript applications.
It stores data on the client (browser, Node.js, React Native, Electron, Capacitor) and optionally replicates with a backend server.
Data is modeled as JSON documents inside collections, validated by JSON Schema, and queried with the Mango/MongoDB query syntax.
All data access is reactive through RxJS Observables so that UI components update automatically when data changes.

Source code: https://github.com/pubkey/rxdb
Website: https://rxdb.info

Topic-specific documentation files:
- [Core API](https://rxdb.info/llms-api.txt): RxDatabase, RxSchema, RxCollection, RxDocument, RxQuery
- [Storages](https://rxdb.info/llms-storages.txt): RxStorage layer, all storage backends and wrappers
- [Replication](https://rxdb.info/llms-replication.txt): Sync engine, HTTP, GraphQL, WebSocket, CouchDB, Firestore, Supabase, WebRTC P2P`,
                excludeImports: false,
                removeDuplicateHeadings: true,
                generateMarkdownFiles: true,
                /**
                 * Order docs by logical sections matching the sidebar structure
                 * so that LLMs see foundational concepts first.
                 */
                includeOrder: [
                    // Getting Started
                    'overview.md',
                    'quickstart.md',
                    'install.md',
                    'dev-mode.md',
                    'docs/tutorials/typescript.md',
                    // Core Entities
                    'rx-database.md',
                    'rx-schema.md',
                    'rx-collection.md',
                    'rx-document.md',
                    'rx-query.md',
                    // Storages
                    'rx-storage.md',
                    'rx-storage-localstorage.md',
                    'rx-storage-indexeddb.md',
                    'rx-storage-opfs.md',
                    'rx-storage-memory.md',
                    'rx-storage-filesystem-node.md',
                    'rx-storage-expo-filesystem.md',
                    'rx-storage-sqlite.md',
                    'rx-storage-dexie.md',
                    'rx-storage-mongodb.md',
                    'rx-storage-denokv.md',
                    'rx-storage-foundationdb.md',
                    // Storage Wrappers
                    'schema-validation.md',
                    'encryption.md',
                    'key-compression.md',
                    'logger.md',
                    'rx-storage-remote.md',
                    'rx-storage-worker.md',
                    'rx-storage-shared-worker.md',
                    'rx-storage-memory-mapped.md',
                    'rx-storage-memory-synced.md',
                    'rx-storage-sharding.md',
                    'rx-storage-localstorage-meta-optimizer.md',
                    'electron.md',
                    // Replication
                    'replication.md',
                    'replication-http.md',
                    'replication-server.md',
                    'replication-graphql.md',
                    'replication-websocket.md',
                    'replication-couchdb.md',
                    'replication-webrtc.md',
                    'replication-firestore.md',
                    'replication-mongodb.md',
                    'replication-supabase.md',
                    'replication-google-drive.md',
                    'replication-microsoft-onedrive.md',
                    'replication-nats.md',
                    'replication-appwrite.md',
                    // Server
                    'rx-server.md',
                    'rx-server-scaling.md',
                    // How RxDB works
                    'transactions-conflicts-revisions.md',
                    'query-cache.md',
                    'plugins.md',
                    'errors.md',
                    // Advanced Features
                    'testing.md',
                    'migration-schema.md',
                    'migration-storage.md',
                    'rx-attachment.md',
                    'rx-pipeline.md',
                    'reactivity.md',
                    'rx-state.md',
                    'rx-local-document.md',
                    'cleanup.md',
                    'backup.md',
                    'leader-election.md',
                    'middleware.md',
                    'crdt.md',
                    'population.md',
                    'orm.md',
                    'fulltext-search.md',
                    'query-optimizer.md',
                    'webmcp.md',
                    'third-party-plugins.md',
                    // Performance
                    'rx-storage-performance.md',
                    'nosql-performance-tips.md',
                    'slow-indexeddb.md',
                ],
                includeUnmatchedLast: true,
                pathTransformation: {
                    ignorePaths: ['docs'],
                },
                customLLMFiles: [
                    {
                        filename: 'llms-api.txt',
                        includePatterns: [
                            'overview.md',
                            'quickstart.md',
                            'install.md',
                            'rx-database.md',
                            'rx-schema.md',
                            'rx-collection.md',
                            'rx-document.md',
                            'rx-query.md',
                            'rx-attachment.md',
                            'rx-local-document.md',
                            'rx-state.md',
                            'rx-pipeline.md',
                            'rx-storage.md',
                            'docs/tutorials/typescript.md',
                        ],
                        fullContent: true,
                        title: 'RxDB Core API Documentation',
                        description: 'Reference for the core RxDB API: RxDatabase, RxSchema, RxCollection, RxDocument, RxQuery, and related entities.',
                    },
                    {
                        filename: 'llms-storages.txt',
                        includePatterns: [
                            'rx-storage.md',
                            'rx-storage-*.md',
                            'schema-validation.md',
                            'encryption.md',
                            'key-compression.md',
                            'logger.md',
                            'electron.md',
                        ],
                        fullContent: true,
                        title: 'RxDB Storage Documentation',
                        description: 'Complete reference for the RxDB RxStorage layer, all storage backends (LocalStorage, IndexedDB, OPFS, SQLite, Memory, Dexie.js, MongoDB, FoundationDB, DenoKV) and storage wrappers (encryption, compression, sharding, workers).',
                    },
                    {
                        filename: 'llms-replication.txt',
                        includePatterns: [
                            'replication.md',
                            'replication-*.md',
                        ],
                        fullContent: true,
                        title: 'RxDB Replication Documentation',
                        description: 'Complete reference for RxDB replication and data sync: HTTP, GraphQL, WebSocket, CouchDB, Firestore, Supabase, WebRTC P2P, and more.',
                    },
                ],
            },
        ],
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
                        resolve: {
                            alias: {
                                // we no longer use prism, and highlight with Shiki on the server
                                // alias the built-in prism-react-renderer with empty stub to reduce bundle size
                                'prism-react-renderer': require.resolve('./src/prism-stub'),
                            },
                        },
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
                sitemap: {
                    lastmod: 'date',
                    changefreq: 'weekly',
                    priority: 0.5,
                    filename: 'sitemap.xml',
                },
                docs: {
                    sidebarPath: './sidebars.js',
                    routeBasePath: '',
                    path: './docs',
                    showLastUpdateTime: true,
                    breadcrumbs: false,
                    // I disabled the editUrl because it just confuses users and does not look professional
                    // editUrl: 'https://github.com/pubkey/rxdb/tree/master/docs-src/',
                    beforeDefaultRehypePlugins: [
                        [rehypePrettyCode, rehypePrettyCodeOptions],
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
        metadata: [
            { name: 'keywords', content: 'RxDB, JavaScript database, local-first, offline-first, reactive database, NoSQL, real-time sync, browser database, IndexedDB, TypeScript' },
            { property: 'og:type', content: 'website' },
            { name: 'twitter:site', content: '@rxdbjs' },
        ],
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
                    position: 'left'
                },
                {
                    href: '/replication.html',
                    label: 'Sync',
                    position: 'left',
                    dropdown: 'sync'
                },
                {
                    href: '/rx-storage.html',
                    label: 'Storages',
                    position: 'left',
                    dropdown: 'storages'
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
