/**
 * this is a template for a test.
 * If you found a bug, edit this test to reproduce it
 * and than make a pull-request with that failing test.
 * The maintainer will later move your test to the correct position in the test-suite.
 *
 * To run this test do:
 * - 'npm run test:node' so it runs in nodejs
 * - 'npm run test:browser' so it runs in the browser
 */
import assert from 'assert';
import AsyncTestUtil from 'async-test-util';
import config from './config.ts';

import {
    createRxDatabase,
    randomToken,
    RxStorage
} from '../../plugins/core/index.mjs';
import {
    isNode
} from '../../plugins/test-utils/index.mjs';
import {
    replicateRxCollection
} from '../../plugins/replication/index.mjs';

describe('bug-report.test.js', () => {
    it('a rejection in the first start() of a replication is unhandled and every later start() rejects with it', async function () {
        if (!isNode) {
            // uses process.on('unhandledRejection')
            return;
        }

        const unhandled: any[] = [];
        const onUnhandled = (reason: any) => unhandled.push(reason);
        process.on('unhandledRejection', onUnhandled);

        /**
         * Make the first start() fail by letting the storage reject
         * the creation of the replication meta instance once.
         * Any other rejection inside of RxReplicationState._start() behaves the same.
         */
        const storage = config.storage.getStorage();
        let failNextMetaInstance = true;
        const failingStorage: RxStorage<any, any> = Object.assign({}, storage, {
            createStorageInstance(params: any) {
                if (failNextMetaInstance && params.collectionName.startsWith('rx-replication-meta-')) {
                    failNextMetaInstance = false;
                    return Promise.reject(new Error('meta instance could not be created'));
                }
                return storage.createStorageInstance(params);
            }
        });

        const db = await createRxDatabase({
            name: randomToken(10),
            storage: failingStorage
        });
        const collections = await db.addCollections({
            mycollection: {
                schema: {
                    version: 0,
                    primaryKey: 'passportId',
                    type: 'object',
                    properties: {
                        passportId: {
                            type: 'string',
                            maxLength: 100
                        }
                    }
                }
            }
        });

        const replicationState = replicateRxCollection({
            collection: collections.mycollection,
            replicationIdentifier: randomToken(10),
            live: true,
            autoStart: true,
            waitForLeadership: false,
            pull: {
                handler: () => Promise.resolve({ documents: [], checkpoint: null })
            }
        });
        const errors: any[] = [];
        replicationState.error$.subscribe(err => errors.push(err));
        await AsyncTestUtil.wait(500);
        const unhandledAfterAutoStart = unhandled.length;

        // the storage works again, so the next start() should succeed
        let restartError: any;
        try {
            await replicationState.start();
            await replicationState.awaitInitialReplication();
        } catch (err) {
            restartError = err;
        }

        process.off('unhandledRejection', onUnhandled);
        await replicationState.cancel();
        await db.close();

        assert.deepStrictEqual(
            {
                unhandledRejectionsFromAutoStart: unhandledAfterAutoStart,
                errorsEmittedOnErrorStream: errors.length,
                startAfterCauseRemoved: restartError ? 'rejected: ' + restartError.message : 'resolved'
            },
            {
                unhandledRejectionsFromAutoStart: 0,
                errorsEmittedOnErrorStream: 1,
                startAfterCauseRemoved: 'resolved'
            }
        );
    });
});
