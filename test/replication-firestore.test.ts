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

import * as firebase from 'firebase/app';

import {
    schemaObjects,
    humansCollection,
    ensureReplicationHasNoErrors,
    HumanDocumentType,
    ensureCollectionsHaveEqualState,
    HumanWithTimestampDocumentType,
    humanSchemaLiteral,
    HumanWithOwnershipDocumentType
} from '../plugins/test-utils/index.mjs';

import { RxDBDevModePlugin } from '../plugins/dev-mode/index.mjs';

import {
    CollectionReference,
    getFirestore,
    collection as getFirestoreCollection,
    connectFirestoreEmulator,
    getDocs,
    query,
    doc as DocRef,
    setDoc,
    serverTimestamp,
    where,
    orderBy,
    limit,
    getDoc,
    QueryConstraint,
    or
} from 'firebase/firestore';
import {
    FirestoreOptions,
    replicateFirestore,
    RxFirestoreReplicationState,
    SyncOptionsFirestore
} from '../plugins/replication-firestore/index.mjs';
import config from './unit/config.ts';
import { wrappedValidateZSchemaStorage } from '../plugins/validate-z-schema/index.mjs';


/**
 * The tests for the firestore replication plugin
 * do not run in the normal test suite
 * because it is too slow to setup the firestore backend emulators.
 */
describe('replication-firestore.test.ts', function () {
    addRxPlugin(RxDBDevModePlugin);

    this.timeout(1000 * 20);
    /**
     * Use a low batchSize in all tests
     * to make it easier to test boundaries.
     */
    const batchSize = 5;
    type TestDocType = HumanWithTimestampDocumentType;
    async function getAllDocsOfFirestore<DT = TestDocType>(firestore: FirestoreOptions<DT>, ...criteria: QueryConstraint[]): Promise<DT[]> {
        const result = await getDocs(query(firestore.collection, ...criteria));
        return result.docs.map(d => {
            const docData = d.data();
            (docData as any).id = d.id;
            return docData;
        }) as any;
    }
    const projectId = randomToken(10);
    const ownerUid = 'owner1';

    config.storage.init?.();
    const app = firebase.initializeApp({
        projectId,
        databaseURL: 'http://localhost:8080?ns=' + projectId
    });
    const database = getFirestore(app);
    connectFirestoreEmulator(database, 'localhost', 8080, { mockUserToken: { user_id: ownerUid } });

    function getFirestoreState(rootCollection = 'public'): FirestoreOptions<TestDocType> {
        const useCollection: CollectionReference<TestDocType> = getFirestoreCollection(database, rootCollection, randomToken(10), randomToken(10)) as any;
        return {
            projectId,
            collection: useCollection,
            database
        };
    }
    async function syncOnce(collection: RxCollection, firestoreState: FirestoreOptions<any>, options?: Pick<SyncOptionsFirestore<any>, 'pull' | 'push'>) {
        const replicationState = replicateFirestore({
            replicationIdentifier: firestoreState.projectId,
            collection,
            firestore: firestoreState,
            live: false,
            pull: options?.pull ?? {},
            push: options?.push ?? {},
        });
        ensureReplicationHasNoErrors(replicationState);
        await replicationState.awaitInitialReplication();
    }
    function syncFirestore<RxDocType = TestDocType>(
        collection: RxCollection<RxDocType>,
        firestoreState: FirestoreOptions<RxDocType>
    ): RxFirestoreReplicationState<RxDocType> {
        const replicationState = replicateFirestore({
            replicationIdentifier: randomToken(10),
            collection,
            firestore: firestoreState,
            pull: {
                batchSize
            },
            push: {
                batchSize
            }
        });
        ensureReplicationHasNoErrors(replicationState);
        return replicationState;
    }

    function makeFirestoreHumanDocument(human: HumanDocumentType) {
        const firestoreHuman: any = { ...human };
        firestoreHuman.id = firestoreHuman.passportId;
        delete firestoreHuman.passportId;

        firestoreHuman.serverTimestamp = serverTimestamp();

        return firestoreHuman as any;
    }

    describe('preconditions', () => {
        it('query sorted by server timestamp', async () => {
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
            const olderDoc = ensureNotFalsy(docsOnServer.find(d => d.id === 'older'));
            const queryTimestamp = (olderDoc as any).serverTimestamp.toDate();
            const newerQuery = query(firestoreState.collection,
                where('serverTimestamp', '>', queryTimestamp),
                orderBy('serverTimestamp', 'asc'),
                limit(10)
            );
            const queryResult = await getDocs<TestDocType, any>(newerQuery as any);
            assert.strictEqual(queryResult.docs.length, 1);
            assert.strictEqual(
                ensureNotFalsy(queryResult.docs[0]).data().id,
                'younger'
            );
        });
    });
    describe('live replication', () => {
        it('push replication to client-server', async () => {
            const collection = await humansCollection.createHumanWithTimestamp(2, undefined, false);

            const firestoreState = await getFirestoreState();

            const replicationState = syncFirestore(collection, firestoreState);
            ensureReplicationHasNoErrors(replicationState);
            await replicationState.awaitInitialReplication();

            let docsOnServer = await getAllDocsOfFirestore(firestoreState);
            assert.strictEqual(docsOnServer.length, 2);

            // insert another one
            await collection.insert(schemaObjects.humanWithTimestampData());
            await replicationState.awaitInSync();

            docsOnServer = await getAllDocsOfFirestore(firestoreState);
            assert.strictEqual(docsOnServer.length, 3);

            // update one
            const doc = await collection.findOne().exec(true);
            await doc.incrementalPatch({ age: 100 });
            await replicationState.awaitInSync();
            docsOnServer = await getAllDocsOfFirestore(firestoreState);
            assert.strictEqual(docsOnServer.length, 3);
            const serverDoc = ensureNotFalsy(docsOnServer.find(d => d.id === doc.primary));
            assert.strictEqual(serverDoc.age, 100);

            // delete one
            await doc.getLatest().remove();
            await replicationState.awaitInSync();
            docsOnServer = await getAllDocsOfFirestore(firestoreState);
            // must still have 3 because there are no hard deletes
            assert.strictEqual(docsOnServer.length, 3);
            assert.ok(docsOnServer.find(d => (d as any)._deleted));

            collection.database.close();
        });
        it('two collections', async () => {
            const collectionA = await humansCollection.createHumanWithTimestamp(1, undefined, false);
            const collectionB = await humansCollection.createHumanWithTimestamp(1, undefined, false);

            const firestoreState = await getFirestoreState();
            const replicationStateA = syncFirestore(collectionA, firestoreState);

            ensureReplicationHasNoErrors(replicationStateA);
            await replicationStateA.awaitInitialReplication();


            const replicationStateB = syncFirestore(collectionB, firestoreState);
            ensureReplicationHasNoErrors(replicationStateB);
            await replicationStateB.awaitInitialReplication();

            await replicationStateA.awaitInSync();

            await ensureCollectionsHaveEqualState(collectionA, collectionB);

            // insert one
            await collectionA.insert(schemaObjects.humanWithTimestampData({ id: 'insert', name: 'InsertName' }));
            await replicationStateA.awaitInSync();

            await replicationStateB.awaitInSync();
            await ensureCollectionsHaveEqualState(collectionA, collectionB);

            // delete one
            await collectionB.findOne().remove();
            await replicationStateB.awaitInSync();
            await replicationStateA.awaitInSync();
            await ensureCollectionsHaveEqualState(collectionA, collectionB);

            // insert many
            await collectionA.bulkInsert(
                new Array(10)
                    .fill(0)
                    .map(() => schemaObjects.humanWithTimestampData({ name: 'insert-many' }))
            );
            await replicationStateA.awaitInSync();

            await replicationStateB.awaitInSync();
            await ensureCollectionsHaveEqualState(collectionA, collectionB);

            // insert at both collections at the same time
            await Promise.all([
                collectionA.insert(schemaObjects.humanWithTimestampData({ name: 'insert-parallel-A' })),
                collectionB.insert(schemaObjects.humanWithTimestampData({ name: 'insert-parallel-B' }))
            ]);
            await replicationStateA.awaitInSync();
            await replicationStateB.awaitInSync();
            await replicationStateA.awaitInSync();
            await replicationStateB.awaitInSync();
            await ensureCollectionsHaveEqualState(collectionA, collectionB);

            collectionA.database.close();
            collectionB.database.close();
        });
    });
    describe('conflict handling', () => {
        it('should keep the master state as default conflict handler', async () => {
            const firestoreState = await getFirestoreState();
            const c1 = await humansCollection.create(1);
            const c2 = await humansCollection.create(0);

            await syncOnce(c1, firestoreState);
            await syncOnce(c2, firestoreState);

            const doc1 = await c1.findOne().exec(true);
            const doc2 = await c2.findOne().exec(true);

            // make update on both sides
            await doc1.incrementalPatch({ firstName: 'c1' });
            await doc2.incrementalPatch({ firstName: 'c2' });

            await syncOnce(c2, firestoreState);

            // cause conflict
            await syncOnce(c1, firestoreState);

            /**
             * Must have kept the master state c2
             */
            assert.strictEqual(doc1.getLatest().firstName, 'c2');

            c1.database.close();
            c2.database.close();
        });
    });

    describe('filtered replication', () => {
        it('should only sync filtered documents from firestore', async () => {
            const firestoreState = getFirestoreState();

            const h1 = makeFirestoreHumanDocument(schemaObjects.humanData('replicated', 35, 'replicated'));
            const h2 = makeFirestoreHumanDocument(schemaObjects.humanData('not replicated', 27, 'not replicated'));

            await setDoc(DocRef(firestoreState.collection, 'replicated'), h1);
            await setDoc(DocRef(firestoreState.collection, 'not replicated'), h2);

            const collection = await humansCollection.create(0);

            await syncOnce(collection, firestoreState, {
                pull: {
                    filter: where('firstName', '==', 'replicated')
                },
                push: {},
            });

            const allLocalDocs = await collection.find().exec();

            assert.strictEqual(allLocalDocs.length, 1);
            assert.strictEqual(allLocalDocs[0].passportId, 'replicated');

            collection.database.close();
        });

        it('should only sync filtered documents to firestore', async () => {
            const firestoreState = getFirestoreState();

            const collection = await humansCollection.create(0);


            await collection.insert(schemaObjects.humanData('replicated', 35, 'filtered-replication-c2s-1'));
            await collection.insert(schemaObjects.humanData('not replicated', 27, 'filtered-replication-c2s-2'));

            await syncOnce(collection, firestoreState, {
                pull: {},
                push: {
                    filter(human: WithDeleted<HumanDocumentType>) {
                        return (human as any).age > 30;
                    },
                },
            });

            const docsOnServer = await getAllDocsOfFirestore(firestoreState);

            assert.strictEqual(docsOnServer.length, 1);
            assert.strictEqual(docsOnServer[0].id, 'replicated');

            collection.database.close();
        });

        it('should sync documents matching an or constraint from firestore', async () => {
            const firestoreState = getFirestoreState();

            const h1 = makeFirestoreHumanDocument(schemaObjects.humanData('alice', 25, 'alice-passport'));
            const h2 = makeFirestoreHumanDocument(schemaObjects.humanData('bob', 45, 'bob-passport'));
            const h3 = makeFirestoreHumanDocument(schemaObjects.humanData('charlie', 30, 'charlie-passport'));
            const h4 = makeFirestoreHumanDocument(schemaObjects.humanData('diana', 50, 'diana-passport'));

            await setDoc(DocRef(firestoreState.collection, 'alice-passport'), h1);
            await setDoc(DocRef(firestoreState.collection, 'bob-passport'), h2);
            await setDoc(DocRef(firestoreState.collection, 'charlie-passport'), h3);
            await setDoc(DocRef(firestoreState.collection, 'diana-passport'), h4);

            const collection = await humansCollection.create(0);

            await syncOnce(collection, firestoreState, {
                pull: {
                    filter: or(
                        where('firstName', '==', 'alice'),
                        where('firstName', '==', 'diana')
                    )
                },
                push: {},
            });

            const allLocalDocs = await collection.find().exec();

            assert.strictEqual(allLocalDocs.length, 2);
            const passportIds = allLocalDocs.map(d => d.passportId).sort();
            assert.deepStrictEqual(passportIds, ['alice-passport', 'diana-passport']);

            collection.database.close();
        });
    });
    describe('issues', () => {
        it('#4698 adding items quickly does not send them to the server', async () => {
            const name = randomToken(10);
            const db = await createRxDatabase({
                name,
                storage: config.storage.getStorage(),
                eventReduce: true,
                ignoreDuplicate: true
            });

            // create a collection
            const collections = await db.addCollections({
                mycollection: {
                    schema: humanSchemaLiteral
                }
            });

            const firestoreState = getFirestoreState();
            const replicationState = replicateFirestore({
                replicationIdentifier: firestoreState.projectId,
                firestore: firestoreState,
                collection: db.collections.mycollection,
                pull: {},
                push: {},
                live: true,
            });
            ensureReplicationHasNoErrors(replicationState);

            // insert a document
            const doc = await collections.mycollection.insert({
                passportId: 'foobar',
                firstName: 'Bob',
                lastName: 'Kelso',
                age: 56
            });
            await replicationState.awaitInitialReplication();

            await doc.incrementalPatch({ age: 60 });
            await doc.incrementalPatch({ age: 30 });
            await replicationState.awaitInSync();

            // ensure correct local value
            const myDocument = await collections.mycollection.findOne({ selector: { passportId: 'foobar' } }).exec();
            assert.strictEqual(myDocument.age, 30);

            // ensure correct remote value
            const docRef = DocRef(firestoreState.collection, 'foobar');
            const docSnap = ensureNotFalsy(await getDoc(docRef));

            assert.strictEqual(ensureNotFalsy(docSnap.data()).age, 30);
            db.close();
        });
        it('#5572 firestore replication not working with schema validation', async () => {
            const collection = await humansCollection.create(0, undefined, undefined, undefined, wrappedValidateZSchemaStorage({
                storage: config.storage.getStorage()
            }));
            const firestoreState = getFirestoreState();
            const replicationState = replicateFirestore<TestDocType>({
                replicationIdentifier: firestoreState.projectId,
                firestore: firestoreState,
                collection: collection as any,
                pull: {},
                push: {},
                live: true,
            });
            ensureReplicationHasNoErrors(replicationState);
            await replicationState.awaitInitialReplication();

            const doc = await collection.insert(schemaObjects.humanData('foobar'));
            await replicationState.awaitInSync();
            await doc.incrementalPatch({ age: 30 });
            await replicationState.awaitInSync();

            const myDocument = await collection.findOne({ selector: { passportId: 'foobar' } }).exec(true);
            assert.strictEqual(myDocument.age, 30);

            const docRef = DocRef(firestoreState.collection, 'foobar');
            const docSnap = ensureNotFalsy(await getDoc(docRef));
            assert.strictEqual(ensureNotFalsy(docSnap.data()).age, 30);

            collection.database.close();
        });
        it('replicates all docs with identical serverTimestamp from the server', async () => {
            const firestoreState = getFirestoreState();
            const collection = await humansCollection.create(0);

            const now = new Date();
            const h1 = {
                ...makeFirestoreHumanDocument(
                    schemaObjects.humanData('replicated-1', 35, 'replicated')
                ),
                serverTimestamp: now,
            };
            const h2 = {
                ...makeFirestoreHumanDocument(
                    schemaObjects.humanData('replicated-2', 27, 'replicated')
                ),
                serverTimestamp: now,
            };

            await setDoc(DocRef(firestoreState.collection, 'replicated-1'), h1);
            await setDoc(DocRef(firestoreState.collection, 'replicated-2'), h2);

            await syncOnce(collection, firestoreState, {
                pull: {
                    batchSize: 1,
                },
                push: {},
            });

            const allLocalDocs = await collection.find().exec();

            assert.strictEqual(allLocalDocs.length, 2);

            collection.database.close();
        });
        it('#6707 firestore replication this owner rules', async () => {
            const collection1 = await humansCollection.createHumanWithOwnership(2, undefined, false, ownerUid);
            const firestoreState = getFirestoreState('ownership');
            const replicationState = replicateFirestore<HumanWithOwnershipDocumentType>({
                replicationIdentifier: firestoreState.projectId,
                firestore: firestoreState as any,
                collection: collection1,
                pull: {
                    filter: [
                        where('owner', '==', ownerUid),
                    ],
                },
                push: {},
                live: true,
                autoStart: true
            });
            ensureReplicationHasNoErrors(replicationState);
            await replicationState.awaitInitialReplication();

            const docsOnServer = await getAllDocsOfFirestore(firestoreState, where('owner', '==', ownerUid));
            assert.strictEqual(docsOnServer.length, 2);
        });

    });
});
