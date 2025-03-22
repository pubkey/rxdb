/* eslint-disable @typescript-eslint/no-require-imports */
const sdk = require('node-appwrite');
const { randomString, waitUntil } = require('async-test-util');
const appwritePrimaryKeyCharset = 'abcdefghijklmnopqrstuvwxyz';

function startAppwriteServer() {
    const databaseId = 'ci-db-' + randomString(10, appwritePrimaryKeyCharset);
    const endpoint = 'http://localhost/v1';
    const client = new sdk.Client();
    client
        .setEndpoint(endpoint)
        // .setEndpoint('https://cloud.appwrite.io/v1')
        .setKey('standard_fe4c7fdcda16def6c6038145459f9a9549c2e50f97695010d9be3ca7ce90c8581a91c1c936ec86fde4e116e05d3c4abd00ad80b50652c5efa3882475b15994ddd119e02e809b3b232bea23a631d6a38aba73bed7adc62d396796872b8454a8c4e230bece31a26129f61c18d40b247178c505671c4f10e30a118b885deec48a9e');
    // .setKey('standard_6...');


    let databases = new sdk.Databases(client);
    const projectId = 'rxdb-test-1';

    (async () => {

        // await projects.create('rxdb-test-1', 'rxdb-test-1');
        await client.setProject(projectId);

        /**
         * Wait until the docker containers are up
         * and everything is imported
         */
        await waitUntil(async () => {
            try {
                await databases.list();
                return true;
            } catch (err) {
                console.log('couldn\'t reach project (' + projectId + '), trying again...');
                return false;
            }
        }, 100 * 1000, 500);

        // create/clear database
        const dbs = await databases.list();
        if (dbs.databases.length > 0) {
            console.log('# DELETING DATABASE START');
            await databases.delete(
                dbs.databases[0].$id
            );
            console.log('# DELETING DATABASE DONE');
        }
        await databases.create(
            databaseId,
            databaseId
        );

        console.log('await databases.list(): ' + databaseId);
        console.dir(await databases.list());
        databases = new sdk.Databases(client);

        const permissions = [
            sdk.Permission.read(sdk.Role.any()),
            sdk.Permission.create(sdk.Role.any()),
            sdk.Permission.update(sdk.Role.any()),
            sdk.Permission.delete(sdk.Role.any())
        ];
        const collection = await databases.createCollection(
            databaseId,
            'test-collection-1',
            'test-collection-1',
            permissions
        );
        await databases.createStringAttribute(
            databaseId,
            collection.$id,
            'firstName',
            255,
            true
        );
        await databases.createStringAttribute(
            databaseId,
            collection.$id,
            'lastName',
            255,
            true
        );
        await databases.createBooleanAttribute(
            databaseId,
            collection.$id,
            'deleted',
            true
        );
        await databases.createIntegerAttribute(
            databaseId,
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

