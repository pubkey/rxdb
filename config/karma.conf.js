const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const {
    blobBufferUtil
} = require('../');

const staticFilesPath = path.join(
    __dirname,
    '../',
    'docs-src',
    'files'
);
console.log('staticFilesPath: ' + staticFilesPath);


// while the karma tests run, we need some things which we start here
const GraphQLServer = require('../test_tmp/helper/graphql-server');
function thingsWeNeed() {
    // we need one graphql server so the browser can sync to it
    GraphQLServer.spawn([], 18000);

    /**
     * we need to serve some static files
     * to run tests for attachments
     */
    const fileServerPort = 18001;
    const app = express();
    app.use(cors());
    app.get('/', (req, res) => {
        res.send('Hello World!');
    });
    app.use('/files', express.static(staticFilesPath));
    app.get('/base64/:filename', async (req, res) => {
        const filename = req.params.filename;
        const filePath = path.join(
            staticFilesPath,
            filename
        );
        const buffer = fs.readFileSync(filePath);
        const blob = new Blob([buffer]);
        const base64String = await blobBufferUtil.toBase64String(blob);
        res.set('Content-Type', 'text/html');
        res.send(base64String);
    });
    app.listen(fileServerPort, () => console.log(`Server listening on port: ${fileServerPort}`));
}
thingsWeNeed();

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
     * see
     * @link https://github.com/litixsoft/karma-detect-browsers
     */
    detectBrowsers: {
        enabled: true,
        usePhantomJS: false,
        postDetection: function (availableBrowser) {
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

