/**
 * when the same data-source is used by 2 instance of the same database,
 * than they should emit ChangeEvents to each other
 * This is important if 2 Windows/Tabs of the same website is open and one changes data
 * The tests for this behaviour are done here
 */

import assert from 'assert';
import AsyncTestUtil, { wait, waitUntil } from 'async-test-util';

import config from './config.ts';
import {
    isRxDatabase,
    createRxDatabase,
    randomToken,
    promiseWait,
    RxDatabase,
    RxDocument,
    ensureNotFalsy,
    RxCollection
} from '../../plugins/core/index.mjs';
import { getRxStorageDexie } from '../../plugins/storage-dexie/index.mjs';
import { wrappedValidateAjvStorage } from '../../plugins/validate-ajv/index.mjs';
import {
    indexedDB as fakeIndexedDB,
    IDBKeyRange as fakeIDBKeyRange
} from 'fake-indexeddb';

import {
    schemaObjects,
    schemas,
    humansCollection,
    getPassword,
    getEncryptedStorage,
    HumanDocumentType,
    isNode
} from '../../plugins/test-utils/index.mjs';

describe('cross-instance.test.js', () => {
    if (!config.storage.hasMultiInstance) {
        return;
    }
    describe('create database', () => {
        it('create a multiInstance database', async () => {
            const db = await createRxDatabase({
                name: randomToken(10),
                storage: config.storage.getStorage(),
                multiInstance: true
            });
            assert.ok(isRxDatabase(db));
            db.close();
        });
        it('create a 2 multiInstance databases', async () => {
            const name = randomToken(10);
            const db = await createRxDatabase({
                name,
                storage: config.storage.getStorage(),
                multiInstance: true,
                ignoreDuplicate: true
            });
            const db2 = await createRxDatabase({
                name,
                storage: config.storage.getStorage(),
                multiInstance: true,
                ignoreDuplicate: true
            });
            assert.ok(isRxDatabase(db));
            assert.ok(isRxDatabase(db2));
            db.close();
            db2.close();
        });
    });
    describe('RxDatabase.$', () => {
        describe('positive', () => {
            it('get event on db2 when db1 fires', async () => {
                const name = randomToken(10);
                const c1 = await humansCollection.createMultiInstance(name);
                const c2 = await humansCollection.createMultiInstance(name);
                const db1: RxDatabase = c1.database;
                const db2: RxDatabase = c2.database;

                let received = 0;
                db2.$.subscribe(cEvent => {
                    received++;
                    assert.ok(cEvent.operation);
                });
                await c1.insert(schemaObjects.humanData());
                await AsyncTestUtil.waitUntil(() => {
                    return received > 0;
                });

                db1.close();
                db2.close();
            });
        });
        describe('negative', () => {
            it('should not get the same events twice', async () => {

                const name = randomToken(10);
                const c1 = await humansCollection.createMultiInstance(name);
                const c2 = await humansCollection.createMultiInstance(name);
                const db1: RxDatabase = c1.database;
                const db2: RxDatabase = c2.database;

                const emitted: any[] = [];
                db2.$.subscribe(cEvent => {
                    emitted.push(cEvent);
                    assert.ok(cEvent.operation);
                });
                await c1.insert(schemaObjects.humanData());
                await wait(100);

                await AsyncTestUtil.waitUntil(() => {
                    if (emitted.length > 1) {
                        throw new Error('got too many events ' + emitted.length);
                    }
                    return emitted.length === 1;
                });

                db1.close();
                db2.close();
            });
        });
    });
    describe('Collection.$', () => {
        it('get event on db2 when db1 fires', async () => {
            const name = randomToken(10);
            const c1 = await humansCollection.createMultiInstance(name);
            const c2 = await humansCollection.createMultiInstance(name);
            let received = 0;
            c2.$.subscribe(cEvent => {
                received++;
                assert.ok(cEvent.operation);
            });
            await c1.insert(schemaObjects.humanData());

            await AsyncTestUtil.waitUntil(() => {
                return received > 0;
            });

            c1.database.close();
            c2.database.close();
        });
    });

    describe('RxQuery', () => {
        it('should have the correct query results when the event of another instance arrives after the event of a later own write', async function () {
            this.timeout(120 * 1000);
            if (!isNode) {
                return;
            }
            /**
             * The Dexie storage sends the events of other instances
             * asynchronously over the BroadcastChannel.
             */
            const storage = wrappedValidateAjvStorage({
                storage: getRxStorageDexie({
                    indexedDB: fakeIndexedDB,
                    IDBKeyRange: fakeIDBKeyRange
                })
            });
            const name = randomToken(10);
            async function createInstance(): Promise<RxCollection<HumanDocumentType>> {
                const db = await createRxDatabase<{ human: RxCollection<HumanDocumentType>; }>({
                    name,
                    storage,
                    multiInstance: true,
                    ignoreDuplicate: true
                });
                const collections = await db.addCollections({
                    human: {
                        schema: schemas.human
                    }
                });
                return collections.human;
            }
            const c1 = await createInstance();
            const c2 = await createInstance();
            const query = c1.find({ sort: [{ passportId: 'asc' }] });
            const toState = (docs: RxDocument<HumanDocumentType>[]) => docs.map(d => d.passportId + '|' + d.firstName);

            let lastEmitted: string[] = [];
            let lastCount = -1;
            const eventsByDocId = new Map<string, number>();
            const subs = [
                query.$.subscribe(docs => lastEmitted = toState(docs)),
                c1.count().$.subscribe(count => lastCount = count),
                c1.$.subscribe(event => eventsByDocId.set(
                    event.documentId,
                    (eventsByDocId.get(event.documentId) ?? 0) + 1
                ))
            ];

            const iterations = 40;
            for (let i = 0; i < iterations; i++) {
                const id = 'doc' + (i + '').padStart(3, '0');
                /**
                 * The upsert of c1 runs into a conflict when c2 has stored the document first.
                 * It then writes on top of the state of c2 and c1 gets its own event
                 * before the insert event of c2 arrives.
                 */
                const [insertResult] = await Promise.allSettled([
                    c2.insert(schemaObjects.humanData(id, 20, 'other')),
                    c1.upsert(schemaObjects.humanData(id, 20, 'own'))
                ]);
                const expectedEvents = insertResult.status === 'fulfilled' ? 2 : 1;
                await waitUntil(() => eventsByDocId.get(id) === expectedEvents);

                const storageState = toState(await c2.find({ sort: [{ passportId: 'asc' }] }).exec());
                assert.strictEqual(storageState.length, i + 1);
                assert.deepStrictEqual(toState(await query.exec()), storageState, 'exec() in iteration ' + i);
                await waitUntil(() => lastEmitted.length === storageState.length, 1000).catch(() => { });
                assert.deepStrictEqual(lastEmitted, storageState, 'find().$ in iteration ' + i);
                assert.strictEqual(await c1.count().exec(), i + 1, 'count().exec() in iteration ' + i);
                assert.strictEqual(lastCount, i + 1, 'count().$ in iteration ' + i);
            }

            subs.forEach(sub => sub.unsubscribe());
            await c1.database.close();
            await c2.database.close();
        });
    });
    describe('Document.$', () => {
        it('get event on doc2 when doc1 is changed', async () => {
            const name = randomToken(10);
            const c1 = await humansCollection.createMultiInstance(name);
            const c2 = await humansCollection.createMultiInstance(name);
            await c1.insert(schemaObjects.humanData());

            const doc1 = await c1.findOne().exec(true);

            let doc2: RxDocument<HumanDocumentType> | null = null as any;
            await waitUntil(async () => {
                doc2 = await c2.findOne().exec();
                return !!doc2;
            });

            let received = 0;
            ensureNotFalsy(doc2).$.subscribe(() => {
                received = received + 1;
            });

            let firstNameAfter: any;
            ensureNotFalsy(doc2).get$('firstName').subscribe((newValue: any) => {
                firstNameAfter = newValue;
            });

            await doc1.incrementalPatch({ firstName: 'foobar' });

            await promiseWait(10);
            await AsyncTestUtil.waitUntil(() => firstNameAfter === 'foobar');

            assert.strictEqual(firstNameAfter, 'foobar');
            c1.database.close();
            c2.database.close();
        });
        it('should work with encrypted fields', async () => {
            const name = randomToken(10);
            const password = await getPassword();
            const db1 = await createRxDatabase({
                name,
                storage: getEncryptedStorage(),
                password,
                multiInstance: true,
                ignoreDuplicate: true
            });
            const db2 = await createRxDatabase({
                name,
                storage: getEncryptedStorage(),
                password,
                multiInstance: true,
                ignoreDuplicate: true
            });
            const c1 = await db1.addCollections({
                human: {
                    schema: schemas.encryptedHuman
                }
            });
            const c2 = await db2.addCollections({
                human: {
                    schema: schemas.encryptedHuman
                }
            });
            await c1.human.insert(schemaObjects.encryptedHumanData());

            const doc1 = await c1.human.findOne().exec(true);

            let doc2: typeof doc1 | null = null;
            await waitUntil(async () => {
                doc2 = await c2.human.findOne().exec();
                return !!doc2;
            });

            let receivedCollection = 0;
            c2.human.$.subscribe(() => {
                receivedCollection = receivedCollection + 1;
            });

            let received = 0;
            doc2.$.subscribe(() => {
                received = received + 1;
            });

            let secretAfter: any;
            doc2.get$('secret').subscribe((newValue: any) => {
                secretAfter = newValue;
            });

            await doc1.incrementalPatch({ secret: 'foobar' });

            await AsyncTestUtil.waitUntil(() => secretAfter === 'foobar');
            assert.strictEqual(secretAfter, 'foobar');

            db1.close();
            db2.close();
        });
        it('should work with nested encrypted fields', async () => {
            const name = randomToken(10);
            const password = await getPassword();
            const db1 = await createRxDatabase({
                name,
                storage: getEncryptedStorage(),
                password,
                multiInstance: true,
                ignoreDuplicate: true
            });
            const db2 = await createRxDatabase({
                name,
                storage: getEncryptedStorage(),
                password,
                multiInstance: true,
                ignoreDuplicate: true
            });
            const c1 = await db1.addCollections({
                human: {
                    schema: schemas.encryptedObjectHuman
                }
            });
            const c2 = await db2.addCollections({
                human: {
                    schema: schemas.encryptedObjectHuman
                }
            });
            await c1.human.insert(schemaObjects.encryptedObjectHumanData());

            const doc1 = await c1.human.findOne().exec(true);
            let doc2: typeof doc1 | null = null;
            await waitUntil(async () => {
                doc2 = await c2.human.findOne().exec();
                return !!doc2;
            });

            let receivedCollection = 0;
            c2.human.$.subscribe(() => {
                receivedCollection = receivedCollection + 1;
            });

            let received = 0;
            doc2.$.subscribe(() => {
                received = received + 1;
            });

            let secretAfter: any;
            doc2.get$('secret').subscribe((newValue: any) => {
                secretAfter = newValue;
            });

            await doc1.incrementalPatch({
                secret: {
                    name: 'foo',
                    subname: 'bar'
                }
            });

            await AsyncTestUtil.waitUntil(() => secretAfter.name === 'foo');

            assert.deepStrictEqual(JSON.stringify(secretAfter), JSON.stringify({
                name: 'foo',
                subname: 'bar'
            }));

            db1.close();
            db2.close();
        });
    });
    describe('AutoPull', () => {
        describe('positive', () => {
            it('should receive events on the other side', async () => {
                const name = randomToken(10);
                const c1 = await humansCollection.createMultiInstance(name);
                const c2 = await humansCollection.createMultiInstance(name);

                const emitted = [];
                c2.$.subscribe(ev => emitted.push(ev));

                await c1.insert(schemaObjects.humanData());

                await waitUntil(() => emitted.length >= 1);

                c1.database.close();
                c2.database.close();
            });
            it('should receive 2 events', async () => {
                const name = randomToken(10);
                const c1 = await humansCollection.createMultiInstance(name);
                const c2 = await humansCollection.createMultiInstance(name);

                let received = 0;
                c2.$.subscribe(cEvent => {
                    received++;
                    assert.ok(cEvent.operation);
                });

                await c1.insert(schemaObjects.humanData());
                await c1.insert(schemaObjects.humanData());

                await AsyncTestUtil.waitUntil(() => received === 2);
                assert.strictEqual(received, 2);
                c1.database.close();
                c2.database.close();
            });
        });
    });
});
