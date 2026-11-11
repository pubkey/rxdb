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
    RxCollection,
    RxDocument,
    ensureNotFalsy,
} from '../../plugins/core/index.mjs';

import {
    schemaObjects,
    schemas,
    humansCollection,
    getPassword,
    getEncryptedStorage,
    HumanDocumentType
} from '../../plugins/test-utils/index.mjs';
import { getRxStorageDexie } from '../../plugins/storage-dexie/index.mjs';
import { wrappedValidateAjvStorage } from '../../plugins/validate-ajv/index.mjs';
import {
    indexedDB as fakeIndexedDB,
    IDBKeyRange as fakeIDBKeyRange
} from 'fake-indexeddb';

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
        it('should not apply a write of another instance twice when the query result already contains it', async () => {
            /**
             * The dexie storage sends the events to the other instances asynchronously,
             * so a query can read a write of another instance before the event of that write arrives.
             */
            const storage = wrappedValidateAjvStorage({
                storage: getRxStorageDexie({
                    indexedDB: fakeIndexedDB,
                    IDBKeyRange: fakeIDBKeyRange
                })
            });
            const name = randomToken(10);
            const createCollection = async () => {
                const db = await createRxDatabase<{ human: RxCollection<HumanDocumentType>; }>({
                    name,
                    storage,
                    multiInstance: true,
                    ignoreDuplicate: true,
                    allowSlowCount: true
                });
                const collections = await db.addCollections({
                    human: {
                        schema: schemas.human
                    }
                });
                return collections.human;
            };
            const c1 = await createCollection();
            const c2 = await createCollection();

            const wrong: string[] = [];
            for (let i = 0; i < 20; i++) {
                const docData = schemaObjects.humanData('doc-' + i, i, 'first-' + i);

                // c1 inserts while c2 runs new queries for the first time
                const insertPromise = c1.insert(docData);
                for (let k = 0; k < (i % 10); k++) {
                    await promiseWait(0);
                }
                const countQuery = c2.count({ selector: { firstName: docData.firstName } });
                const findQuery = c2.find({ selector: { firstName: docData.firstName } });
                let lastCount = -1;
                let lastIds: string[] = [];
                const sub1 = countQuery.$.subscribe(count => lastCount = count);
                const sub2 = findQuery.$.subscribe(docs => lastIds = docs.map(d => d.primary));
                const doc = await insertPromise;
                await wait(50);
                const countExec = await countQuery.exec();
                if (lastCount !== 1 || countExec !== 1 || lastIds.length !== 1) {
                    wrong.push('insert ' + i + ': count$=' + lastCount + ' count.exec()=' + countExec + ' find$=' + lastIds.join(','));
                }
                sub1.unsubscribe();
                sub2.unsubscribe();

                // c1 removes while c2 runs a new query for the first time
                const removePromise = doc.remove();
                for (let k = 0; k < (i % 10); k++) {
                    await promiseWait(0);
                }
                const countQuery2 = c2.count({ selector: { age: i } });
                let lastCount2 = -1;
                const sub3 = countQuery2.$.subscribe(count => lastCount2 = count);
                await removePromise;
                await wait(50);
                const countExec2 = await countQuery2.exec();
                if (lastCount2 !== 0 || countExec2 !== 0) {
                    wrong.push('remove ' + i + ': count$=' + lastCount2 + ' count.exec()=' + countExec2);
                }
                sub3.unsubscribe();
            }
            assert.deepStrictEqual(wrong, []);

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
