/**
 * when the same data-source is used by 2 instance of the same database,
 * than they should emit ChangeEvents to each other
 * This is important if 2 Windows/Tabs of the same website is open and one changes data
 * The tests for this behaviour are done here
 */

import assert from 'assert';
import AsyncTestUtil, { wait, waitUntil } from 'async-test-util';

import { mergeMap, of } from 'rxjs';

import config from './config.ts';
import {
    isRxDatabase,
    createRxDatabase,
    randomToken,
    promiseWait,
    RxDatabase,
    RxCollection,
    RxDocument,
    RxStorage,
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
            const name = randomToken(10);
            const createCollection = async (storage: RxStorage<any, any>) => {
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
            const heldEventsStorage = getStorageWithHeldEvents();
            const c1 = await createCollection(config.storage.getStorage());
            const c2 = await createCollection(heldEventsStorage.storage);
            let c2Events = 0;
            const eventSub = c2.$.subscribe(() => c2Events = c2Events + 1);
            const docData = schemaObjects.humanData('doc-1', 1, 'first-1');

            /**
             * c2 runs new queries after the insert of c1 was stored
             * and before the event of that insert arrives at c2.
             */
            heldEventsStorage.holdEvents = true;
            const doc = await c1.insert(docData);
            const countQuery = c2.count({ selector: { firstName: docData.firstName } });
            const findQuery = c2.find({ selector: { firstName: docData.firstName } });
            let lastCount = -1;
            let lastIds: string[] = [];
            const sub1 = countQuery.$.subscribe(count => lastCount = count);
            const sub2 = findQuery.$.subscribe(docs => lastIds = docs.map(d => d.primary));
            assert.strictEqual(await countQuery.exec(), 1);
            assert.deepStrictEqual((await findQuery.exec()).map(d => d.primary), ['doc-1']);
            await waitUntil(() => heldEventsStorage.heldEvents() > 0);
            heldEventsStorage.holdEvents = false;
            heldEventsStorage.releaseEvents();
            await waitUntil(() => c2Events === 1);

            assert.strictEqual(await countQuery.exec(), 1);
            assert.deepStrictEqual((await findQuery.exec()).map(d => d.primary), ['doc-1']);
            await wait(50);
            assert.strictEqual(lastCount, 1);
            assert.deepStrictEqual(lastIds, ['doc-1']);
            sub1.unsubscribe();
            sub2.unsubscribe();

            // c2 runs a new query after the remove of c1 was stored and before its event arrives
            heldEventsStorage.holdEvents = true;
            await doc.remove();
            const countQuery2 = c2.count({ selector: { age: docData.age } });
            let lastCount2 = -1;
            const sub3 = countQuery2.$.subscribe(count => lastCount2 = count);
            assert.strictEqual(await countQuery2.exec(), 0);
            await waitUntil(() => heldEventsStorage.heldEvents() > 0);
            heldEventsStorage.holdEvents = false;
            heldEventsStorage.releaseEvents();
            await waitUntil(() => c2Events === 2);

            assert.strictEqual(await countQuery2.exec(), 0);
            await wait(50);
            assert.strictEqual(lastCount2, 0);
            sub3.unsubscribe();
            eventSub.unsubscribe();

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

/**
 * Wraps the storage of the test config so that the change events
 * of its instances can be held back and arrive later,
 * like the events of another browser tab can do.
 */
function getStorageWithHeldEvents() {
    const storage = config.storage.getStorage();
    const waiting: (() => void)[] = [];
    const ret = {
        /**
         * While true, the arriving events are held back
         * until releaseEvents() is called.
         */
        holdEvents: false,
        heldEvents: () => waiting.length,
        releaseEvents() {
            waiting.splice(0).forEach(release => release());
        },
        storage: {
            name: storage.name,
            rxdbVersion: storage.rxdbVersion,
            async createStorageInstance(params) {
                const instance = await storage.createStorageInstance(params);
                return {
                    databaseName: instance.databaseName,
                    internals: instance.internals,
                    options: instance.options,
                    schema: instance.schema,
                    collectionName: instance.collectionName,
                    bulkWrite: (a, b) => instance.bulkWrite(a, b),
                    findDocumentsById: (a, b) => instance.findDocumentsById(a, b),
                    query: (a) => instance.query(a),
                    count: (a) => instance.count(a),
                    getAttachmentData: (a, b, c) => instance.getAttachmentData(a, b, c),
                    getChangedDocumentsSince: !instance.getChangedDocumentsSince ? undefined : (a, b) => ensureNotFalsy(instance.getChangedDocumentsSince).call(instance, a, b),
                    changeStream: () => instance.changeStream().pipe(
                        mergeMap(eventBulk => {
                            if (!ret.holdEvents) {
                                return of(eventBulk);
                            }
                            return new Promise<typeof eventBulk>(res => waiting.push(() => res(eventBulk)));
                        })
                    ),
                    cleanup: (a) => instance.cleanup(a),
                    close: () => instance.close(),
                    remove: () => instance.remove()
                };
            }
        } as RxStorage<any, any>
    };
    return ret;
}
