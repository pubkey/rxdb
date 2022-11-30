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
    RxCollection
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
    collection,
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
    async function getTestCollection(docsAmount: number = 0): Promise<RxCollection<TestDocType>> {
        const collection = await humansCollection.createHumanWithTimestamp(docsAmount.local, undefined, false);
    }
    async function getAllDocsOfFirestore<RxDocType>(firestore: FirestoreOptions<RxDocType>): Promise<RxDocType[]> {
        const result = await getDocs(query(firestore.collection));
        return result.docs.map(d => d.data()) as any;
    }
    function getFirestoreStuff(): FirestoreOptions<TestDocType> {
        const projectId = randomCouchString(10);
        const credentials: FirebaseOptions = {
            projectId,
            databaseURL: 'http://localhost:8080?ns=' + projectId
        };

        const app = firebase.initializeApp(credentials);
        const database = getFirestore(app);
        connectFirestoreEmulator(database, 'localhost', 8080);
        const useCollection = collection(database, randomCouchString(10));
        return {
            projectId,
            collection: useCollection,
            database
        };
    }
    it('log some stuff', () => {
        console.log('STORAGE: ' + config.storage.name);
    });
    it('push replication', async () => {
        const collection = await humansCollection.createHumanWithTimestamp(2, undefined, false);
        const firestore = await getFirestoreStuff();

        const replicationState = collection.syncFirestore({
            firestore,
            updateSortField: 'updatedAt',
            pull: {},
            push: {}
        });
        await replicationState.awaitInitialReplication();

        const docsOnServer = await getAllDocsOfFirestore(firestore);
        console.dir(docsOnServer);


        collection.database.destroy();
    });
});
