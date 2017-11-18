const tests = require('../test/unit.test');

const configuration = {
    basePath: '',
    frameworks: [
        'mocha',
        'browserify',
        'detectBrowsers'
    ],
    files: tests.browser,
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
            const browsers = availableBrowser
                .filter(b => !['PhantomJS', 'FirefoxAurora', 'FirefoxNightly'].includes(b))
                .map(b => {
                    if (b === 'Chrome') return 'Chrome_travis_ci';
                    else return b;
                });
            return browsers;
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
            bail: true,
            timeout: 6000
        }
    },
    browsers: ['ChromeNoSandbox'],
    browserDisconnectTimeout: 6000,
    processKillTimeout: 6000,
    customLaunchers: {
        Chrome_travis_ci: {
            base: 'Chrome',
            flags: ['--no-sandbox']
        }
    },
    singleRun: true
};

if (process.env.TRAVIS) {
    configuration.browsers = ['Chrome_travis_ci'];

    /**
     * overwrite reporters-default
     * So no big list will be shown at log
     */
    configuration.reporters = [];
}

module.exports = function(config) {
    config.set(configuration);
};
