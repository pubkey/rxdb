/**
 * Setup file for the mocha native parallel mode which is used
 * in the NODE_ENV=fast test runs.
 * In parallel mode, mocha runs each test file in a worker process,
 * so the side effects of init.test.ts do not apply to the other files.
 * Instead this file is passed to mocha via --require:
 * - The global fixtures run once in the main process.
 * - The root hooks and the module scope run in each worker process.
 * @link https://mochajs.org/#parallel-tests
 */
import config from '../unit/config.ts';
import {
    clearNodeFolder
} from 'broadcast-channel';
import { addRxPlugin } from '../../plugins/core/index.mjs';
import { RxDBDevModePlugin } from '../../plugins/dev-mode/index.mjs';
import { RxDBAttachmentsPlugin } from '../../plugins/attachments/index.mjs';
import { RxDBCleanupPlugin } from '../../plugins/cleanup/index.mjs';
import { RxDBJsonDumpPlugin } from '../../plugins/json-dump/index.mjs';
import { RxDBLeaderElectionPlugin } from '../../plugins/leader-election/index.mjs';
import { RxDBLocalDocumentsPlugin } from '../../plugins/local-documents/index.mjs';
import { RxDBMigrationSchemaPlugin } from '../../plugins/migration-schema/index.mjs';
import { RxDBPipelinePlugin } from '../../plugins/pipeline/index.mjs';
import { RxDBQueryBuilderPlugin } from '../../plugins/query-builder/index.mjs';
import { RxDBUpdatePlugin } from '../../plugins/update/index.mjs';
import { RxDBVectorPlugin } from '../../plugins/vector/index.mjs';

addRxPlugin(RxDBDevModePlugin);

/**
 * When the test files run as a single bundle,
 * all module-scope addRxPlugin() calls of all test files
 * have run before the first test starts.
 * In parallel mode each file runs in its own worker process,
 * so we register the same plugins here to keep the behavior equal.
 */
addRxPlugin(RxDBAttachmentsPlugin);
addRxPlugin(RxDBCleanupPlugin);
addRxPlugin(RxDBJsonDumpPlugin);
addRxPlugin(RxDBLeaderElectionPlugin);
addRxPlugin(RxDBLocalDocumentsPlugin);
addRxPlugin(RxDBMigrationSchemaPlugin);
addRxPlugin(RxDBPipelinePlugin);
addRxPlugin(RxDBQueryBuilderPlugin);
addRxPlugin(RxDBUpdatePlugin);
addRxPlugin(RxDBVectorPlugin);

/**
 * exit with non-zero on unhandledRejection,
 * same behavior as in init.test.ts
 */
process.on('unhandledRejection', function (error, p) {
    console.log('parallel-setup.ts: unhandledRejection');
    console.dir(p);
    console.error(error);
    console.log('------- END OF unhandledRejection debug logs');
    process.exit(5);
});

/**
 * Runs once in the main process
 * before the worker processes are created.
 */
export async function mochaGlobalSetup() {
    await clearNodeFolder();
    console.log('START TEST SERVERS');
    const { startTestServers } = await import('' + './test-servers.js' + '');
    startTestServers();
}

export const mochaHooks = {
    /**
     * Runs in the worker process
     * once per test file before its tests.
     */
    beforeAll: async function () {
        if (config.storage.init) {
            await config.storage.init();
        }
    }
};
