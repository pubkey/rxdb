/* eslint-disable linebreak-style */


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
        'browserify'
    ],
    browserify: {
        debug: true,
        insertGlobalVars: {
            Buffer: (file) => file.includes('node_modules') ? 'require("buffer").Buffer' : undefined,
            'Buffer.isBuffer': undefined
        }
    },
    files: [
        '../test_tmp/unit.test.js'
    ],
    port: 9876,
    colors: true,
    autoWatch: false,

    // Karma plugins loaded
    plugins: [
        'karma-mocha',
        'karma-browserify',
        'karma-chrome-launcher',
        // karma-edge-launcher does not properly pickup the edge chromium browser.
        // This plugin is able to detect the edge browser and use it.
        '@chiragrupani/karma-chromium-edge-launcher'
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
    browsers: ['Chrome_travis_ci', 'Edge'],
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

