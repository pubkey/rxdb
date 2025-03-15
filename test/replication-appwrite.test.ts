/**
 * this test checks the integration with firestore
 * You need a running firebase backend
 */
import assert from 'assert';

import {
    randomToken,
    RxCollection,
    ensureNotFalsy,
    WithDeleted,
    createRxDatabase,
    addRxPlugin
} from '../plugins/core/index.mjs';

import {
    schemaObjects,
    humansCollection,
    ensureReplicationHasNoErrors,
    HumanDocumentType,
    ensureCollectionsHaveEqualState,
    HumanWithTimestampDocumentType,
    humanSchemaLiteral
} from '../plugins/test-utils/index.mjs';

import { RxDBDevModePlugin } from '../plugins/dev-mode/index.mjs';


import {
    SyncOptionsAppwrite
} from '../plugins/replication-appwrite/index.mjs';
import config from './unit/config.ts';
import { wrappedValidateZSchemaStorage } from '../plugins/validate-z-schema/index.mjs';
import {
    Client
} from 'appwrite';

/**
 * The tests for the firestore replication plugin
 * do not run in the normal test suite
 * because it is too slow to setup the firestore backend emulators.
 */
describe('replication-appwrite.test.ts', function () {
    addRxPlugin(RxDBDevModePlugin);

    this.timeout(1000 * 20);

    let client: Client;
    it('init', async () => {
        client = new Client();
        client.setProject('rxdb-test-1');
    });

});
