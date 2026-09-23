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
    getPrimaryKeyOfInternalDocument,
    _collectionNamePrimary,
    INTERNAL_CONTEXT_COLLECTION,
    getSingleDocument,
    writeSingle,
    createRevision,
    now
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

        const mySchema = {
            version: 0,
            primaryKey: 'passportId',
            type: 'object',
            properties: {
                passportId: {
                    type: 'string',
                    maxLength: 100
                },
                firstName: {
                    type: 'string'
                }
            }
        };
        const db = await createRxDatabase({
            name: randomToken(10),
            storage: config.storage.getStorage()
        });
        const collections = await db.addCollections({
            mycollection: {
                schema: mySchema
            }
        });
        const collection = collections.mycollection;

        /**
         * Make the first start() fail.
         * Here this is done by removing the collection document from the internal store,
         * so addConnectedStorageToCollection() throws "ensureNotFalsy() is falsy".
         * Any other rejection inside of RxReplicationState._start() behaves the same.
         */
        const collectionDocId = getPrimaryKeyOfInternalDocument(
            _collectionNamePrimary(collection.name, collection.schema.jsonSchema),
            INTERNAL_CONTEXT_COLLECTION
        );
        const collectionDoc: any = await getSingleDocument(db.internalStore, collectionDocId);
        const deletedDoc: any = await writeSingle(db.internalStore, {
            previous: collectionDoc,
            document: Object.assign({}, collectionDoc, {
                _deleted: true,
                _rev: createRevision(db.token, collectionDoc),
                _meta: { lwt: now() }
            })
        }, 'bug-report');

        const replicationState = replicateRxCollection({
            collection,
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

        // Remove the cause, then start again.
        await writeSingle(db.internalStore, {
            previous: deletedDoc,
            document: Object.assign({}, collectionDoc, {
                _deleted: false,
                _rev: createRevision(db.token, deletedDoc),
                _meta: { lwt: now() }
            })
        }, 'bug-report');
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
