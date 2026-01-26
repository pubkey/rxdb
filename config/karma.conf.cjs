



module.exports = async function (config) {


    // while the karma tests run, we need some things which we start here
    const { startTestServers, TEST_STATIC_FILE_SERVER_PORT } = await import('../test_tmp/helper/test-servers.js');
    startTestServers();

    const webpackConfig = await import('./karma.webpack.conf.cjs');

    // karma config
    const configuration = {
        basePath: '',
        frameworks: [
            'mocha',
            'webpack',
            'detectBrowsers'
        ],
        webpack: webpackConfig.default,
        // Source files that you wanna generate coverage for.
        // Do not include tests or libraries (these files will be instrumented by Istanbul)
        preprocessors: {
            '../test_tmp/unit.test.js': ['webpack', 'sourcemap']
        },
        files: [
            '../test_tmp/unit.test.js'
        ],
        port: 9876,
        colors: true,
        autoWatch: false,

        /**
         * Serve these static files from the same port
         * so we can use it to server web-workers and stuff
         * and access them with same-origin-restricted code.
         */
        proxies: {
            '/files': 'http://localhost:' + TEST_STATIC_FILE_SERVER_PORT + '/files'
        },
        /**
         * see
         * @link https://github.com/litixsoft/karma-detect-browsers
         */
        detectBrowsers: {
            enabled: true,
            usePhantomJS: false,
            postDetection: function (availableBrowser) {
                // respect cli args overwrites
                const indexOfBrowsers = process.argv.indexOf('--browsers');
                if (indexOfBrowsers > 0) {
                    return [process.argv[indexOfBrowsers + 1]];
                }

                // return ['Chrome'];
                // return ['Firefox'];

                const doNotUseTheseBrowsers = [
                    'PhantomJS',
                    'SafariTechPreview',
                    'FirefoxAurora',
                    'FirefoxNightly',
                    'ChromeCanary',

                    /**
                     * To ensure that we only run in one chromium based
                     * browser in Github Actions, we strip chromium here
                     * for faster CI runs.
                     */
                    'Chromium'
                ];
                const browsers = availableBrowser
                    .filter(b => !doNotUseTheseBrowsers.includes(b));

                console.log('# Karma browsers:');
                console.dir(browsers);

                return browsers;
            }
        },

        // Karma plugins loaded
        plugins: [
            'karma-mocha',
            'karma-webpack',
            'karma-chrome-launcher',
            'karma-safari-launcher',
            'karma-firefox-launcher',
            'karma-ie-launcher',
            'karma-opera-launcher',
            'karma-detect-browsers',
            'karma-spec-reporter',
            'karma-sourcemap-loader'
        ],
        client: {
            mocha: {
                bail: true,
                /**
                 * Yes we need a really big value here
                 * because the CI servers have a non-predictable
                 * computation power and sometimes they can be really slow.
                 */
                timeout: 120000
            },
            /**
             * Pass all env variables here,
             * so that they can be used in the browsers JavaScript process.
             * @link https://stackoverflow.com/a/38879184
             */
            env: process.env
        },
        browserDisconnectTimeout: 120000,
        browserNoActivityTimeout: 120000,
        processKillTimeout: 120000,
        singleRun: true,


        /**
         * Use this reported to fully log all test names
         * which makes it easier to debug.
         * @link https://github.com/tmcgee123/karma-spec-reporter
         */
        reporters: ['spec']
    };

    if (process.env.CI) {
        console.log('# Use CI settings.');
        /**
         * overwrite reporters-default
         * So no big list will be shown at log
         */
        // configuration.reporters = [];

        // how many browser should be started simultaneously
        configuration.concurrency = 1;
    }


    config.set(configuration);
};

