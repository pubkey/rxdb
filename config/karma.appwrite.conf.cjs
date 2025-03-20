/* eslint-disable @typescript-eslint/no-require-imports */
const sdk = require('node-appwrite');
const { randomString } = require('async-test-util');
const appwritePrimaryKeyCharset = 'abcdefghijklmnopqrstuvwxyz';

function startAppwriteServer() {
    const databaseId = 'ci-db-' + randomString(10, appwritePrimaryKeyCharset);
    const client = new sdk.Client();
    client
        .setEndpoint('http://localhost/v1')
        // .setEndpoint('https://cloud.appwrite.io/v1')
        .setProject('rxdb-test-1')
        .setKey('');
        // .setKey('standard_6...');
        const databases = new sdk.Databases(client);

    (async () => {
        const dbs = await databases.list();
        if (dbs.databases.length > 0) {
            console.log('# DELETING DATABASE START');
            await databases.delete(
                dbs.databases[0].$id
            );
            console.log('# DELETING DATABASE DONE');
        }
        const database = await databases.create(
            databaseId,
            databaseId
        );

        const permissions = [
            sdk.Permission.read(sdk.Role.any()),
            sdk.Permission.create(sdk.Role.any()),
            sdk.Permission.update(sdk.Role.any()),
            sdk.Permission.delete(sdk.Role.any())
        ];
        const collection = await databases.createCollection(
            database.$id,
            'test-collection-1',
            'test-collection-1',
            permissions
        );
        await databases.createStringAttribute(
            database.$id,
            collection.$id,
            'firstName',
            255,
            true
        );
        await databases.createStringAttribute(
            database.$id,
            collection.$id,
            'lastName',
            255,
            true
        );
        await databases.createBooleanAttribute(
            database.$id,
            collection.$id,
            'deleted',
            true
        );
        await databases.createIntegerAttribute(
            database.$id,
            collection.$id,
            'age',
            true,
            0, 100
        );
        console.log('# CONFIGURING DATABASE DONE');
    })();

    return databaseId;
}

module.exports = async function (config) {
    // // while the karma tests run, we need some things which we start here
    const databaseId = startAppwriteServer();

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
            args: [databaseId],
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

