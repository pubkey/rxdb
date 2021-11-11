import assert from 'assert';
import AsyncTestUtil, {
    clone, wait
} from 'async-test-util';

import {
    first
} from 'rxjs/operators';

import config from './config';
import * as schemaObjects from '../helper/schema-objects';
import {
    HumanWithTimestampDocumentType
} from '../helper/schema-objects';
import * as humansCollection from '../helper/humans-collection';

import {
    addRxPlugin,
    createRxDatabase,
    RxJsonSchema,
    hash,
    randomCouchString,
    _handleToStorageInstance,
    flatClone,
    getFromMapOrThrow,
} from '../../plugins/core';

import {
    addPouchPlugin,
    pouchSwapPrimaryToId,
    PouchDB,
    getRxStoragePouch
} from '../../plugins/pouchdb';


import {
    setLastPushSequence,
    getLastPushSequence,
    getChangesSinceLastPushSequence,
    createRevisionForPulledDocument,
    setLastPullDocument,
    getLastPullDocument,
    wasRevisionfromPullReplication,
    replicateRxCollection
} from '../../plugins/replication';
import * as schemas from '../helper/schemas';

import type {
    RxDocumentData,
    WithDeleted
} from '../../src/types';

describe('replication.test.js', () => {
    const REPLICATION_IDENTIFIER_TEST = 'replication-ident-tests'
    config.parallel('revision-flag', () => {
        describe('.wasRevisionfromPullReplication()', () => {
            it('should be false on random revision', async () => {
                const c = await humansCollection.createHumanWithTimestamp(1);
                const doc = await c.findOne().exec(true);

                const wasFromPull = wasRevisionfromPullReplication(
                    REPLICATION_IDENTIFIER_TEST,
                    doc.toJSON(true)._rev
                );
                assert.strictEqual(wasFromPull, false);

                c.database.destroy();
            });
            it('should be true for pulled revision', async () => {
                if (config.storage.name !== 'pouchdb') {
                    return;
                }

                const c = await humansCollection.createHumanWithTimestamp(0);
                let toPouch: any = schemaObjects.humanWithTimestamp();
                toPouch._rev = '1-' + createRevisionForPulledDocument(
                    REPLICATION_IDENTIFIER_TEST,
                    toPouch
                );
                toPouch = pouchSwapPrimaryToId(
                    c.schema.primaryPath,
                    toPouch
                );
                await c.storageInstance.internals.pouch.bulkDocs(
                    [_handleToStorageInstance(c, toPouch)],
                    {
                        new_edits: false
                    }
                );

                const doc = await c.findOne().exec(true);
                const wasFromPull = wasRevisionfromPullReplication(
                    REPLICATION_IDENTIFIER_TEST,
                    doc.toJSON(true)._rev
                );
                assert.strictEqual(wasFromPull, true);

                c.database.destroy();
            });
        });
    });
    config.parallel('replication-checkpoints', () => {
        describe('.setLastPushSequence()', () => {
            it('should set the last push sequence', async () => {
                const c = await humansCollection.createHumanWithTimestamp(0);
                const ret = await setLastPushSequence(
                    c,
                    REPLICATION_IDENTIFIER_TEST,
                    1
                );
                assert.ok(ret._id.includes(REPLICATION_IDENTIFIER_TEST));
                c.database.destroy();
            });
            it('should be able to run multiple times', async () => {
                const c = await humansCollection.createHumanWithTimestamp(0);
                await setLastPushSequence(
                    c,
                    REPLICATION_IDENTIFIER_TEST,
                    1
                );
                await setLastPushSequence(
                    c,
                    REPLICATION_IDENTIFIER_TEST,
                    2
                );
                c.database.destroy();
            });
        });
        describe('.getLastPushSequence()', () => {
            it('should get null if not set before', async () => {
                const c = await humansCollection.createHumanWithTimestamp(0);
                const ret = await getLastPushSequence(
                    c,
                    REPLICATION_IDENTIFIER_TEST
                );
                assert.strictEqual(ret, 0);
                c.database.destroy();
            });
            it('should get the value if set before', async () => {
                const c = await humansCollection.createHumanWithTimestamp(0);
                await setLastPushSequence(
                    c,
                    REPLICATION_IDENTIFIER_TEST,
                    5
                );
                const ret = await getLastPushSequence(
                    c,
                    REPLICATION_IDENTIFIER_TEST
                );
                assert.strictEqual(ret, 5);
                c.database.destroy();
            });
            it('should get the value if set multiple times', async () => {
                const c = await humansCollection.createHumanWithTimestamp(0);
                await setLastPushSequence(
                    c,
                    REPLICATION_IDENTIFIER_TEST,
                    5
                );
                const ret = await getLastPushSequence(
                    c,
                    REPLICATION_IDENTIFIER_TEST
                );
                assert.strictEqual(ret, 5);

                await setLastPushSequence(
                    c,
                    REPLICATION_IDENTIFIER_TEST,
                    10
                );
                const ret2 = await getLastPushSequence(
                    c,
                    REPLICATION_IDENTIFIER_TEST
                );
                assert.strictEqual(ret2, 10);
                c.database.destroy();
            });
        });
        describe('.getChangesSinceLastPushSequence()', () => {
            it('should get all changes', async () => {
                const amount = 5;
                const c = await humansCollection.createHumanWithTimestamp(amount);
                const changesResult = await getChangesSinceLastPushSequence(
                    c,
                    REPLICATION_IDENTIFIER_TEST,
                    10
                );
                assert.strictEqual(changesResult.changedDocs.size, amount);
                const firstChange = Array.from(changesResult.changedDocs.values())[0];
                assert.ok(firstChange.doc.name);
                c.database.destroy();
            });
            it('should get only the newest update to documents', async () => {
                const amount = 5;
                const c = await humansCollection.createHumanWithTimestamp(amount);
                const oneDoc = await c.findOne().exec(true);
                await oneDoc.atomicPatch({ age: 1 });
                const changesResult = await getChangesSinceLastPushSequence(
                    c,
                    REPLICATION_IDENTIFIER_TEST,
                    10
                );
                assert.strictEqual(changesResult.changedDocs.size, amount);
                c.database.destroy();
            });
            it('should not get more changes then the limit', async () => {
                const amount = 30;
                const c = await humansCollection.createHumanWithTimestamp(amount);
                const changesResult = await getChangesSinceLastPushSequence(
                    c,
                    REPLICATION_IDENTIFIER_TEST,
                    10
                );
                /**
                 * The returned size can be lower then the batchSize
                 * because we skip internal changes like index documents.
                 */
                assert.ok(changesResult.changedDocs.size <= 10);
                c.database.destroy();
            });
            it('should get deletions', async () => {
                const amount = 5;
                const c = await humansCollection.createHumanWithTimestamp(amount);
                const oneDoc = await c.findOne().exec(true);
                await oneDoc.remove();
                const changesResult = await getChangesSinceLastPushSequence(
                    c,
                    REPLICATION_IDENTIFIER_TEST,
                    10
                );
                assert.strictEqual(changesResult.changedDocs.size, amount);
                const deleted = Array.from(changesResult.changedDocs.values()).find((change) => {
                    return change.doc._deleted === true;
                });

                if (!deleted) {
                    throw new Error('deleted missing');
                }

                assert.ok(deleted.doc._deleted);
                assert.ok(deleted.doc.age);

                c.database.destroy();
            });
            it('should get deletions after an update via addRevisions', async () => {
                const c = await humansCollection.createHumanWithTimestamp(1);
                const oneDoc = await c.findOne().exec(true);
                const id = oneDoc.primary;

                const newDocData: RxDocumentData<HumanWithTimestampDocumentType> = flatClone(oneDoc.toJSON(true));
                newDocData.age = 100;
                newDocData._rev = '2-23099cb8125d2c79db839ae3f1211cf8';
                await c.storageInstance.bulkAddRevisions([newDocData]);


                await oneDoc.remove();
                const changesResult = await getChangesSinceLastPushSequence(
                    c,
                    REPLICATION_IDENTIFIER_TEST,
                    10
                );

                assert.strictEqual(changesResult.changedDocs.size, 1);
                const docFromChange = getFromMapOrThrow(changesResult.changedDocs, id);
                assert.ok(docFromChange.doc._deleted);
                assert.strictEqual(docFromChange.doc.age, 100);

                c.database.destroy();
            });
            it('should have resolved the primary', async () => {
                const amount = 5;
                const c = await humansCollection.createHumanWithTimestamp(amount);
                const changesResult = await getChangesSinceLastPushSequence(
                    c,
                    REPLICATION_IDENTIFIER_TEST,
                    10
                );
                const firstChange = Array.from(changesResult.changedDocs.values())[0];

                assert.ok(firstChange.doc.id);
                c.database.destroy();
            });
            it('should have filtered out replicated docs from the endpoint', async () => {
                if (config.storage.name !== 'pouchdb') {
                    return;
                }
                const amount = 5;
                const c = await humansCollection.createHumanWithTimestamp(amount);
                let toPouch: any = schemaObjects.humanWithTimestamp();
                toPouch._rev = '1-' + createRevisionForPulledDocument(
                    REPLICATION_IDENTIFIER_TEST,
                    toPouch
                );
                toPouch = pouchSwapPrimaryToId(
                    c.schema.primaryPath,
                    toPouch
                );

                await c.storageInstance.internals.pouch.bulkDocs(
                    [_handleToStorageInstance(c, toPouch)],
                    {
                        new_edits: false
                    }
                );

                const allDocs = await c.find().exec();

                assert.strictEqual(allDocs.length, amount + 1);

                const changesResult = await getChangesSinceLastPushSequence(
                    c,
                    REPLICATION_IDENTIFIER_TEST,
                    10
                );

                assert.strictEqual(changesResult.changedDocs.size, amount);
                const shouldNotBeFound = Array.from(changesResult.changedDocs.values()).find((change) => change.id === toPouch.id);
                assert.ok(!shouldNotBeFound);

                /**
                 * We need amount+2 because we also have skipped the
                 * document for the updatedAt index of the collection schema.
                 */
                assert.strictEqual(changesResult.lastSequence, amount + 2);
                c.database.destroy();
            });
        });
        describe('.setLastPullDocument()', () => {
            it('should set the document', async () => {
                const c = await humansCollection.createHumanWithTimestamp(1);
                const doc = await c.findOne().exec(true);
                const docData = doc.toJSON(true);
                const ret = await setLastPullDocument(
                    c,
                    REPLICATION_IDENTIFIER_TEST,
                    docData
                );
                assert.ok(ret._id.includes(REPLICATION_IDENTIFIER_TEST));
                c.database.destroy();
            });
            it('should be able to run multiple times', async () => {
                const c = await humansCollection.createHumanWithTimestamp(1);
                const doc = await c.findOne().exec(true);
                const docData = doc.toJSON(true);
                await setLastPullDocument(
                    c,
                    REPLICATION_IDENTIFIER_TEST,
                    docData
                );
                const ret = await setLastPullDocument(
                    c,
                    REPLICATION_IDENTIFIER_TEST,
                    docData
                );
                assert.ok(ret._id.includes(REPLICATION_IDENTIFIER_TEST));
                c.database.destroy();
            });
        });
        describe('.getLastPullDocument()', () => {
            it('should return null if no doc set', async () => {
                const c = await humansCollection.createHumanWithTimestamp(0);
                const ret = await getLastPullDocument(
                    c,
                    REPLICATION_IDENTIFIER_TEST
                );
                assert.strictEqual(ret, null);
                c.database.destroy();
            });
            it('should return the doc if it was set', async () => {
                const c = await humansCollection.createHumanWithTimestamp(1);
                const doc = await c.findOne().exec(true);
                let docData = doc.toJSON(true);
                docData = clone(docData); // clone to make it mutateable
                (docData as any).name = 'foobar';

                await setLastPullDocument(
                    c,
                    REPLICATION_IDENTIFIER_TEST,
                    docData
                );
                const ret = await getLastPullDocument(
                    c,
                    REPLICATION_IDENTIFIER_TEST
                );
                if (!ret) {
                    throw new Error('last pull document missing');
                }
                assert.strictEqual(ret.name, 'foobar');
                c.database.destroy();
            });
        });
    });

    describe('non-live replication', () => {
        it('should replicate both sides', async () => {
            const localCollection = await humansCollection.createHumanWithTimestamp(5);
            const remoteCollection = await humansCollection.createHumanWithTimestamp(5);

            const replicationState = await replicateRxCollection({
                collection: localCollection,
                replicationIdentifier: REPLICATION_IDENTIFIER_TEST,
                live: false,
                pull: {
                    async handler(latestPullDocument) {
                        const minTimestamp = latestPullDocument ? latestPullDocument.updatedAt : 0;
                        const docs = await remoteCollection.find({
                            selector: {
                                updatedAt: {
                                    $gt: minTimestamp
                                }
                            },
                            sort: [
                                { updatedAt: 'asc' }
                            ]
                        }).exec();
                        const docsData = docs.map(doc => {
                            const docData: WithDeleted<HumanWithTimestampDocumentType> = flatClone(doc.toJSON()) as any;
                            docData._deleted = false;
                            return docData;
                        });

                        return {
                            documents: docsData,
                            hasMoreDocuments: false
                        }
                    }
                },
                push: {
                    async handler(docs) {
                        // process deleted
                        const deletedIds = docs
                            .filter(doc => doc._deleted)
                            .map(doc => doc.id);
                        const deletedDocs = await remoteCollection.findByIds(deletedIds);
                        await Promise.all(
                            Array.from(deletedDocs.values()).map(doc => doc.remove())
                        );

                        // process insert/updated
                        const changedDocs = docs
                            .filter(doc => !doc._deleted);
                        await Promise.all(
                            changedDocs.map(doc => remoteCollection.atomicUpsert(doc))
                        );
                    }
                }
            });
            replicationState.error$.subscribe(err => {
                console.log('got error :');
                console.dir(err);
            });

            await replicationState.awaitInitialReplication();

            const docsLocal = await localCollection.find().exec();
            const docsRemote = await remoteCollection.find().exec();

            assert.strictEqual(
                docsLocal.length,
                docsRemote.length
            );
            assert.strictEqual(
                docsLocal.length,
                10
            );

            localCollection.database.destroy();
            remoteCollection.database.destroy();
        });
    });

});
