module.exports = async function (config) {
    // // while the karma tests run, we need some things which we start here
    // const { startTestServers, TEST_STATIC_FILE_SERVER_PORT } = await import('../test_tmp/replication-appwrite.test.js');
    // startTestServers();

    const webpackConfig = await import('./karma.webpack.conf.cjs');
    const configuration = {
        basePath: '',
        frameworks: [
            'mocha',
            'webpack'
        ],
        webpack: webpackConfig.default,
        files: [
            '../test_tmp/replication-appwrite.test.js'
        ],
        // Source files that you wanna generate coverage for.
        // Do not include tests or libraries (these files will be instrumented by Istanbul)
        preprocessors: {
            '../test_tmp/replication-appwrite.test.js': ['webpack', 'sourcemap']
        },
        port: 9876,
        colors: true,
        autoWatch: false,
        browserNoActivityTimeout: 1000 * 60 * 3,

        browsers: ['Chrome'],
        customLaunchers: {
            Chrome_DevTools_Saved_Prefs: {
                base: 'Chrome',
                flags: [
                    '--auto-open-devtools-for-tabs',
                    '--no-sandbox'
                ]
            }
        },


        // Karma plugins loaded
        plugins: [
            'karma-mocha',
            'karma-webpack',
            'karma-chrome-launcher',
            'karma-spec-reporter',
            'karma-sourcemap-loader'
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

    config.set(configuration);
};

