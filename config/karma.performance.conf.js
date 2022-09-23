/**
 */
const configuration = {
    basePath: '',
    frameworks: [
        'mocha',
        'browserify',
        'detectBrowsers'
    ],
    browserify: {
        debug: true,
        insertGlobalVars: {
            Buffer: (file) => file.includes('node_modules') ? 'require("buffer").Buffer' : undefined,
            'Buffer.isBuffer': undefined
        }
    },
    files: [
        '../test_tmp/performance.test.js'
    ],
    port: 9876,
    colors: true,
    autoWatch: false,

    detectBrowsers: {
        enabled: true,
        usePhantomJS: false,
        postDetection: function () {
            /**
             * We run the performance tests only in chrome
             * because it has the same V8 JavaScript engine
             * as we have in Node.js
             */
            return ['Chrome'];
        }
    },

    // Karma plugins loaded
    plugins: [
        'karma-mocha',
        'karma-browserify',
        'karma-chrome-launcher',
        'karma-safari-launcher',
        'karma-firefox-launcher',
        'karma-ie-launcher',
        'karma-opera-launcher',
        'karma-detect-browsers',
        'karma-spec-reporter'
    ],

    // Source files that you wanna generate coverage for.
    // Do not include tests or libraries (these files will be instrumented by Istanbul)
    preprocessors: {
        '../test_tmp/performance.test.js': ['browserify']
    },

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

