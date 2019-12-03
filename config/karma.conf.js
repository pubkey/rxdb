

// while the karma tests run, we need some things which we start here
const GraphQLServer = require('../test_tmp/helper/graphql-server');
async function thingsWeNeed() {
    // we need one graphql server so the browser can sync to it
    GraphQLServer.spawn([], 18000);
}
thingsWeNeed();

// karma config
const configuration = {
    basePath: '',
    frameworks: [
        'mocha',
        'browserify',
        'detectBrowsers'
    ],
    files: [
        '../test_tmp/unit.test.js'
    ],
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
        postDetection: function (availableBrowser) {
            // return [];
            // return ['Chrome']; // comment in to test specific browser
            const browsers = availableBrowser
                .filter(b => !['PhantomJS', 'FirefoxAurora', 'FirefoxNightly', 'ChromeCanary'].includes(b))
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
        'karma-safari-launcher',
        'karma-firefox-launcher',
        'karma-ie-launcher',
        'karma-opera-launcher',
        'karma-detect-browsers'
    ],

    // Source files that you wanna generate coverage for.
    // Do not include tests or libraries (these files will be instrumented by Istanbul)
    preprocessors: {
        '../test_tmp/unit.test.js': ['browserify']
    },

    client: {
        mocha: {
            bail: true,
            timeout: 12000
        }
    },
    browsers: ['Chrome_travis_ci'],
    browserDisconnectTimeout: 12000,
    processKillTimeout: 12000,
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
    // configuration.reporters = [];

    // how many browser should be started simultanous
    configuration.concurrency = 1;
}

module.exports = function (config) {
    config.set(configuration);
};

