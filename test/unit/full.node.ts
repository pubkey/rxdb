/**
 * this tests some basic behavior and then exits with zero-code
 * this is run in a seperate node-process via plugin.test.js
 */

import assert from 'assert';


/**
 * exit with non-zero on unhandledRejection
 */
process.on('unhandledRejection', function (err) {
    console.log('full.node.ts: unhandledRejection');
    console.error(err);
    process.exit(1);
});

const {
    createRxDatabase,
    isRxDocument,
    randomCouchString,
    addRxPlugin
} = require('../../');
const {
    RxDBLeaderElectionPlugin
} = require('../../plugins/leader-election');
addRxPlugin(RxDBLeaderElectionPlugin);
const {
    addPouchPlugin,
    getRxStoragePouch
} = require('../../plugins/pouchdb');
const {
    replicateRxCollection
} = require('../../plugins/replication');
import type {
    RxJsonSchema,
} from '../../';

addPouchPlugin(require('pouchdb-adapter-memory'));

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
        name: randomCouchString(10),
        storage: getRxStoragePouch('memory'),
        ignoreDuplicate: true
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
     * gets destroyed.
     */
    await replicateRxCollection({
        collection,
        replicationIdentifier: 'my-custom-rest-replication',
        live: true,
        // use realy high values to ensure that the CI fails if the node process does not exit by itself.
        liveInterval: 50000,
        retryTime: 50000,
        pull: {
            async handler() {
                return {
                    documents: [],
                    hasMoreDocuments: false
                };
            }
        },
        push: {
            async handler() {
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

    // destroy database
    await db.destroy();
};

run();
