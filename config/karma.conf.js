const tests = require('../test/unit.test');


module.exports = function(config) {
    config.set({
        basePath: '',
        frameworks: [
            'mocha',
            'browserify',
            'detectBrowsers'
        ],
        files: tests,
        /*        files: [
                    '../test_tmp/browser/Adapters.test.js',
                    '../test_tmp/browser/RxBroadcastChannel.test.js',
                    '../test_tmp/browser/Insert.test.js',
                    '../test_tmp/browser/Observe.test.js',
                    '../test_tmp/browser/CrossInstance.test.js',
                    '../test_tmp/browser/LeaderElection.test.js'
                ],*/
        port: 9876,
        colors: true,
        autoWatch: false,

        /**
         * see
         * @link https://github.com/litixsoft/karma-detect-browsers
         */
        detectBrowsers: {
            enabled: true,
            usePhantomJS: false,
            postDetection: function(availableBrowser) {

                // return ['Firefox']; // comment in to test specific browser

                return availableBrowser
                    .filter(b => !['PhantomJS', 'FirefoxAurora', 'FirefoxNightly'].includes(b));
            }
        },

        // Karma plugins loaded
        plugins: [
            'karma-mocha',
            'karma-browserify',
            'karma-chrome-launcher',
            'karma-edge-launcher',
            'karma-firefox-launcher',
            'karma-ie-launcher',
            'karma-opera-launcher',
            'karma-detect-browsers'
        ],

        // Source files that you wanna generate coverage for.
        // Do not include tests or libraries (these files will be instrumented by Istanbul)
        preprocessors: {
            '../test_tmp/unit/*.test.js': ['browserify']
        },

        client: {
            mocha: {
                bail: true
            }
        },
        browsers: ['ChromeNoSandbox'],
        browserDisconnectTimeout: 6000,
        customLaunchers: {
            ChromeNoSandbox: {
                base: 'Chrome',
                flags: ['--no-sandbox']
            }
        },
        singleRun: true
    });
};
