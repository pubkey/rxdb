/**
 * this test checks the integration with couchdb
 * run 'npm run test:couchdb' to use it
 * You need a running couchdb-instance on port 5984
 * Run 'npm run couch:start' to spawn a docker-container
 */
import assert from 'assert';
import { waitUntil } from 'async-test-util';

import {
    randomCouchString,
    addRxPlugin,
    RxCollection,
    ensureNotFalsy
} from '../';

import * as firebase from 'firebase/app';

import * as humansCollection from './helper/humans-collection';
import * as schemaObjects from './helper/schema-objects';

import config from './unit/config';

import type {
    FirebaseOptions
} from 'firebase/app';
import {
    Firestore,
    CollectionReference,
    getFirestore,
    enableMultiTabIndexedDbPersistence,
    collection as getFirestoreCollection,
    connectFirestoreEmulator,
    disableNetwork,
    getDocs,
    query
} from 'firebase/firestore';
import {
    FirestoreOptions,
    RxDBReplicationFirestorePlugin
} from '../plugins/replication-firestore';

addRxPlugin(RxDBReplicationFirestorePlugin);

/**
 * The tests for the firstore replication plugin
 * do not run in the normal test suite
 * because it is too slow to setup the firstore backend emulators.
 */
describe('replication-firstore.test.js', () => {
    type TestDocType = schemaObjects.HumanWithTimestampDocumentType;
    async function getAllDocsOfFirestore(firestore: FirestoreOptions<TestDocType>): Promise<TestDocType[]> {
        const result = await getDocs(query(firestore.collection));
        return result.docs.map(d => d.data()) as any;
    }
    function getFirestoreState(): FirestoreOptions<TestDocType> {
        const projectId = randomCouchString(10);
        const credentials: FirebaseOptions = {
            projectId,
            databaseURL: 'http://localhost:8080?ns=' + projectId
        };

        const app = firebase.initializeApp(credentials);
        const database = getFirestore(app);
        connectFirestoreEmulator(database, 'localhost', 8080);
        const useCollection: CollectionReference<TestDocType> = getFirestoreCollection(database, randomCouchString(10)) as any;
        return {
            projectId,
            collection: useCollection,
            database
        };
    }
    it('log some stuff', () => {
        console.log('STORAGE: ' + config.storage.name);
    });
    it('push replication to client-server', async () => {
        const collection = await humansCollection.createHumanWithTimestamp(2, undefined, false);

        const firestoreState = await getFirestoreState();

        const replicationState = collection.syncFirestore({
            firestore: firestoreState,
            updateSortField: 'updatedAt',
            pull: {},
            push: {}
        });
        await replicationState.awaitInitialReplication();

        let docsOnServer = await getAllDocsOfFirestore(firestoreState);
        assert.strictEqual(docsOnServer.length, 2);
        console.dir(docsOnServer);

        // insert another one
        await collection.insert(schemaObjects.humanWithTimestamp());
        await replicationState.awaitInSync();

        docsOnServer = await getAllDocsOfFirestore(firestoreState);
        assert.strictEqual(docsOnServer.length, 3);
        console.dir(docsOnServer);

        // update one
        const doc = await collection.findOne().exec(true);
        console.log('###########################################');
        console.log('###########################################');
        console.log('###########################################');
        await doc.atomicPatch({ age: 100 });
        await replicationState.awaitInSync();
        docsOnServer = await getAllDocsOfFirestore(firestoreState);
        assert.strictEqual(docsOnServer.length, 3);
        const serverDoc = ensureNotFalsy(docsOnServer.find(d => d.id === doc.primary));
        assert.strictEqual(serverDoc.age, 100);
        console.dir(docsOnServer);

        // delete one
        await doc.remove();
        await replicationState.awaitInSync();
        docsOnServer = await getAllDocsOfFirestore(firestoreState);
        // must still have 3 because there are no hard deletes
        assert.strictEqual(docsOnServer.length, 3);
        assert.ok(docsOnServer.find(d => (d as any)._deleted));


        collection.database.destroy();
    });
});
