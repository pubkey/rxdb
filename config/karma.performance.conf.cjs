const path = require('path');

module.exports = async function (config) {

    // while the karma tests run, we need some things which we start here
    const { startTestServers, TEST_STATIC_FILE_SERVER_PORT } = await import('../test_tmp/helper/test-servers.js');
    startTestServers();

    const webpackConfig = await import('./karma.webpack.conf.cjs');
    const configuration = {
        basePath: '',
        frameworks: [
            'mocha',
            'webpack'
        ],
        webpack: webpackConfig.default,
        files: [
            '../test_tmp/performance.test.js'
        ],
        // Source files that you wanna generate coverage for.
        // Do not include tests or libraries (these files will be instrumented by Istanbul)
        preprocessors: {
            '../test_tmp/performance.test.js': ['webpack']
        },
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
        browserNoActivityTimeout: 1000 * 60 * 3,

        /**
         * We run the performance tests only in chrome
         * because it has the same V8 JavaScript engine
         * as we have in Node.js.
         * Use a custom launcher with a set up profile
         * and persistent IndexedDB.
         */
        browsers: ['ChromeWithPersistentIndexedDB'],
        customLaunchers: {
            ChromeWithPersistentIndexedDB: {
                base: 'Chrome',
                flags: [
                    '--user-data-dir=' + path.join(__dirname, '..', '.chrome-profile-perf'),
                    '--no-sandbox',
                    '--no-first-run'
                ]
            }
        },

        // Karma plugins loaded
        plugins: [
            'karma-mocha',
            'karma-webpack',
            'karma-chrome-launcher',
            'karma-spec-reporter'
        ],


        client: {
            mocha: {
                bail: true,
                timeout: 12000
            },
            /**
             * Pass all env variables here,
             * so that they can be used in the browsers JavaScript process.
             * @link https://stackoverflow.com/a/38879184
             */
            env: process.env
        },
        browserDisconnectTimeout: 12000,
        processKillTimeout: 12000,
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

