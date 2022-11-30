/**
 * this test checks the integration with couchdb
 * run 'npm run test:couchdb' to use it
 * You need a running couchdb-instance on port 5984
 * Run 'npm run couch:start' to spawn a docker-container
 */
import assert from 'assert';
import { wait, waitUntil } from 'async-test-util';

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
    query,
    doc as DocRef,
    setDoc,
    serverTimestamp,
    where,
    orderBy,
    limit,
    Timestamp
} from 'firebase/firestore';
import {
    FirestoreOptions,
    RxDBReplicationFirestorePlugin,
    RxFirestoreReplicationState
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
    const projectId = randomCouchString(10);
    const app = firebase.initializeApp({
        projectId,
        databaseURL: 'http://localhost:8080?ns=' + projectId
    });
    const database = getFirestore(app);
    connectFirestoreEmulator(database, 'localhost', 8080);

    function getFirestoreState(): FirestoreOptions<TestDocType> {
        const useCollection: CollectionReference<TestDocType> = getFirestoreCollection(database, randomCouchString(10)) as any;
        return {
            projectId,
            collection: useCollection,
            database
        };
    }
    function ensureReplicationHasNoErrors(replicationState: RxFirestoreReplicationState<TestDocType>) {
        /**
         * We do not have to unsubscribe because the observable will cancel anyway.
         */
        replicationState.error$.subscribe(err => {
            console.error('ensureReplicationHasNoErrors() has error:');
            console.log(err);
            if (err?.parameters?.errors) {
                throw err.parameters.errors[0];
            }
            throw err;
        });
    }
    async function ensureCollectionsHaveEqualState<RxDocType>(
        c1: RxCollection<RxDocType>,
        c2: RxCollection<RxDocType>
    ) {
        const getJson = async (collection: RxCollection<RxDocType>) => {
            const docs = await collection.find().exec();
            return docs.map(d => d.toJSON());
        };
        const json1 = await getJson(c1);
        const json2 = await getJson(c2);
        try {
            assert.deepStrictEqual(
                json1,
                json2
            );
        } catch (err) {
            console.error('ensureCollectionsHaveEqualState() states not equal:');
            console.dir({
                [c1.name]: json1,
                [c2.name]: json2
            });
            throw err;
        }
    }
    it('log some stuff', () => {
        console.log('STORAGE: ' + config.storage.name);
    });
    it('preconditions', async () => {
        const firestoreState = await getFirestoreState();

        // it should be able to query sorted by serverTimestamp
        await setDoc(DocRef(firestoreState.collection, 'older'), {
            id: 'older',
            serverTimestamp: serverTimestamp()
        } as any);
        await setDoc(DocRef(firestoreState.collection, 'younger'), {
            id: 'younger',
            serverTimestamp: serverTimestamp()
        } as any);
        const docsOnServer = await getAllDocsOfFirestore(firestoreState);
        console.log('docsOnServer:');
        console.dir(docsOnServer);
        const olderDoc = ensureNotFalsy(docsOnServer.find(d => d.id === 'older'));

        console.dir(olderDoc);

        const queryTimestamp = (olderDoc as any).serverTimestamp.toDate();
        console.log('queryTimestamp:');
        console.dir((olderDoc as any).serverTimestamp.toDate());
        const newerQuery = query(firestoreState.collection,
            where('serverTimestamp', '>', queryTimestamp),
            orderBy('serverTimestamp', 'asc'),
            limit(10)
        );
        const queryResult = await getDocs<TestDocType>(newerQuery as any);
        console.dir(queryResult.docs.map(d => d.data()));
        assert.strictEqual(queryResult.docs.length, 1);
        assert.strictEqual(
            ensureNotFalsy(queryResult.docs[0]).data().id,
            'younger'
        );
    });
    it('push replication to client-server', async () => {
        const collection = await humansCollection.createHumanWithTimestamp(2, undefined, false);

        const firestoreState = await getFirestoreState();

        const replicationState = collection.syncFirestore({
            firestore: firestoreState,
            pull: {},
            push: {}
        });
        ensureReplicationHasNoErrors(replicationState);
        await replicationState.awaitInitialReplication();

        let docsOnServer = await getAllDocsOfFirestore(firestoreState);
        assert.strictEqual(docsOnServer.length, 2);

        // insert another one
        await collection.insert(schemaObjects.humanWithTimestamp());
        await replicationState.awaitInSync();

        docsOnServer = await getAllDocsOfFirestore(firestoreState);
        assert.strictEqual(docsOnServer.length, 3);

        // update one
        const doc = await collection.findOne().exec(true);
        await doc.atomicPatch({ age: 100 });
        await replicationState.awaitInSync();
        docsOnServer = await getAllDocsOfFirestore(firestoreState);
        assert.strictEqual(docsOnServer.length, 3);
        const serverDoc = ensureNotFalsy(docsOnServer.find(d => d.id === doc.primary));
        assert.strictEqual(serverDoc.age, 100);

        // delete one
        await doc.remove();
        await replicationState.awaitInSync();
        docsOnServer = await getAllDocsOfFirestore(firestoreState);
        // must still have 3 because there are no hard deletes
        assert.strictEqual(docsOnServer.length, 3);
        assert.ok(docsOnServer.find(d => (d as any)._deleted));


        collection.database.destroy();
    });
    it('two collections', async () => {
        const collectionA = await humansCollection.createHumanWithTimestamp(1, undefined, false);
        const collectionB = await humansCollection.createHumanWithTimestamp(1, undefined, false);

        const firestoreState = await getFirestoreState();
        const replicationStateA = collectionA.syncFirestore({
            firestore: firestoreState,
            pull: {},
            push: {}
        });
        ensureReplicationHasNoErrors(replicationStateA);
        await replicationStateA.awaitInitialReplication();

        console.log('----------------- 111');

        const replicationStateB = collectionB.syncFirestore({
            firestore: firestoreState,
            pull: {},
            push: {}
        });
        ensureReplicationHasNoErrors(replicationStateB);
        await replicationStateB.awaitInitialReplication();


        await replicationStateA.reSync();
        await replicationStateA.awaitInSync();

        console.log('_____________ 1');
        await ensureCollectionsHaveEqualState(collectionA, collectionB);

        // insert one
        console.log('_____________ 2');
        await collectionA.insert(schemaObjects.humanWithTimestamp({ id: 'insert', name: 'InsertName' }));
        await replicationStateA.awaitInSync();

        const docsOnServer = await getAllDocsOfFirestore(firestoreState);
        console.log('docs on server:');
        console.dir(docsOnServer);

        replicationStateB.reSync();
        await replicationStateB.awaitInSync();
        await ensureCollectionsHaveEqualState(collectionA, collectionB);

        console.log('_____________ 3');

        // delete one
        await collectionB.findOne().remove();
        await replicationStateB.awaitInSync();
        replicationStateA.reSync();
        await replicationStateA.awaitInSync();
        await ensureCollectionsHaveEqualState(collectionA, collectionB);

        console.log('_____________ 4');

        collectionA.database.destroy();
        collectionB.database.destroy();
    });
});
