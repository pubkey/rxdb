/**
 * this tests some basic behavior and then exits with zero-code
 * this is run in a separate node-process via plugin.test.js
 */

import assert from 'assert';
import { assertThrows } from 'async-test-util';

/**
 * exit with non-zero on unhandledRejection
 */
process.on('unhandledRejection', function (err) {
    console.log('full.node.ts: unhandledRejection');
    console.error(err);
    process.exit(1);
});

import {
    createRxDatabase,
    isRxDocument,
    randomToken,
    addRxPlugin
} from '../../plugins/core/index.mjs';
import {
    RxDBLeaderElectionPlugin
} from '../../plugins/leader-election/index.mjs';
addRxPlugin(RxDBLeaderElectionPlugin);
import {
    getRxStorageMemory
} from '../../plugins/storage-memory/index.mjs';
import {
    replicateRxCollection
} from '../../plugins/replication/index.mjs';
import type {
    RxJsonSchema,
} from '../../plugins/core/index.mjs';

const schema: RxJsonSchema<{ passportId: string; firstName: string; lastName: string; }> = {
    title: 'human schema',
    description: 'describes a human being',
    version: 0,
    primaryKey: 'passportId',
    keyCompression: false,
    type: 'object',
    properties: {
        passportId: {
            type: 'string',
            maxLength: 100
        },
        firstName: {
            type: 'string'
        },
        lastName: {
            type: 'string'
        }
    },
    indexes: [],
    required: ['firstName', 'lastName']
};

const run = async function () {

    // create database
    const db = await createRxDatabase({
        name: randomToken(10),
        storage: getRxStorageMemory()
    });

    // create collection
    await db.addCollections({
        humans: {
            schema
        }
    });
    const collection = db.humans;

    /**
     * Start a replication to ensure
     * all replication timeouts are cleared up when the collection
     * gets closed.
     */
    await replicateRxCollection<any, any>({
        collection,
        replicationIdentifier: 'my-custom-rest-replication',
        live: true,
        // use really high values to ensure that the CI fails if the node process does not exit by itself.
        retryTime: 50000,
        pull: {
            handler() {
                return Promise.resolve({
                    documents: [],
                    hasMoreDocuments: false,
                    checkpoint: null
                });
            }
        },
        push: {
            handler() {
                return Promise.resolve([]);
            },
            batchSize: 5
        }
    });

    // insert
    await db.humans.insert({
        passportId: 'mypw',
        firstName: 'steve',
        lastName: 'piotr'
    });

    // query
    const doc = await db.humans.findOne({
        selector: {
            firstName: {
                $ne: 'foobar'
            }
        }
    }).exec();
    assert.ok(isRxDocument(doc));

    // close database
    await db.close();



    /**
     * Using ignoreduplicate in non dev-mode
     * must not be allowed because using this flag
     * in production can only happen accidentally and makes no sense.
     */
    await assertThrows(
        () => createRxDatabase({
            name: randomToken(10),
            storage: getRxStorageMemory(),
            ignoreDuplicate: true
        }),
        'RxError',
        'DB9'
    );

};

run();
