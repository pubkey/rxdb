

// while the karma tests run, we need some things which we start here
const { startTestServers, TEST_STATIC_FILE_SERVER_PORT } = require('../test_tmp/helper/test-servers');
startTestServers();

// karma config
const configuration = {
    basePath: '',
    frameworks: [
        'mocha',
        'webpack',
        'detectBrowsers'
    ],
    webpack: require('./karma.webpack.conf'),
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
                'ChromeCanary'
            ];
            const browsers = availableBrowser
                .filter(b => !doNotUseTheseBrowsers.includes(b));
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

    // how many browser should be started simultanous
    configuration.concurrency = 1;
}



module.exports = function (config) {

    // console.log('karma config:');
    // console.dir(configuration);

    config.set(configuration);
};

