import assert from 'assert';

import config from './config';
import {
    addRxPlugin,
    randomCouchString,
    flattenEvents,
    normalizeRxJsonSchema,
    normalizeMangoQuery,
    MangoQuery,
    ensureNotFalsy,
    now,
    blobBufferUtil,
    hashAttachmentData,
    getAttachmentSize
} from '../../';

import {
    addCustomEventsPluginToPouch,
    getCustomEventEmitterByPouch,
    PouchDBInstance,
    getRxStoragePouch,
    PouchDB
} from '../../plugins/pouchdb';
import * as schemaObjects from '../helper/schema-objects';


import { RxDBKeyCompressionPlugin } from '../../plugins/key-compression';
addRxPlugin(RxDBKeyCompressionPlugin);

import { RxDBQueryBuilderPlugin } from '../../plugins/query-builder';
import { clone, waitUntil } from 'async-test-util';
import { HumanDocumentType, humanSchemaLiteral } from '../helper/schemas';
import { RxDocumentWriteData } from '../../src/types';
import { EXAMPLE_REVISION_1 } from '../helper/revisions';

addRxPlugin(RxDBQueryBuilderPlugin);

/**
 * RxStoragePouch specific tests
 */
config.parallel('rx-storage-pouchdb.test.js', () => {
    if (config.storage.name !== 'pouchdb') {
        return;
    }
    describe('utils', () => {
        it('.hashAttachmentData() must return the same hash as pouchdb creates for an attachment', async () => {
            const storage = getRxStoragePouch('memory');
            const pouch: PouchDBInstance = new PouchDB(
                randomCouchString(12),
                {
                    adapter: 'memory'
                }
            ) as any;

            const attachmentData = 'foobaasdfasdfsadfr';
            const attachmentDataBlobBuffer = blobBufferUtil.createBlobBuffer(
                attachmentData,
                'text/plain'
            );
            const attachmentDataBBase64 = await blobBufferUtil.toBase64String(attachmentDataBlobBuffer);
            const attachmentId = 'myText';
            const docId = 'myDoc';

            const rxdbHash = await hashAttachmentData(
                attachmentDataBBase64,
                storage.statics
            );

            await pouch.put({
                _id: docId,
                _attachments: {
                    [attachmentId]: {
                        data: attachmentDataBBase64,
                        type: 'text/plain'
                    }
                }
            });
            const pouchDoc = await pouch.get(docId);
            assert.strictEqual(
                pouchDoc._attachments[attachmentId].digest,
                storage.statics.hashKey + '-' + rxdbHash
            );

            const size = getAttachmentSize(attachmentDataBBase64);
            assert.strictEqual(pouchDoc._attachments[attachmentId].length, size);

            pouch.destroy();
        });
    });
    describe('custom events plugin', () => {
        it('should not throw when added to pouch', () => {
            addCustomEventsPluginToPouch();
        });
        it('should emit data on bulkDocs', async () => {
            const pouch: PouchDBInstance = new PouchDB(
                randomCouchString(12),
                {
                    adapter: 'memory'
                }
            ) as any;
            await pouch.info();
            (pouch as any).primaryPath = '_id';

            const emitted: any[] = [];
            const sub = getCustomEventEmitterByPouch(pouch).subject.subscribe(ev => {
                emitted.push(ev);
            });


            await pouch.bulkDocs([{
                _id: 'foo',
                val: 'bar'
            }], {
                // add custom data to the options which should be passed through
                custom: {
                    foo: 'bar'
                }
            } as any);

            await waitUntil(() => flattenEvents(emitted).length === 1);

            const first = flattenEvents(emitted)[0];
            assert.deepStrictEqual(
                first.change.operation,
                'INSERT'
            );

            pouch.destroy();
            sub.unsubscribe();
        });
    });
    describe('.query()', () => {
        it('should respect a custom index', async () => {
            const storage = getRxStoragePouch('memory');
            let schema = clone(humanSchemaLiteral);
            schema.indexes.push(['age']);
            schema.indexes.push(['passportId', 'age']);
            schema.indexes.push(['age', 'passportId']);
            schema.indexes.push(['age', 'firstName', 'passportId']);
            schema.indexes.push(['firstName', 'age', 'passportId']);
            schema = normalizeRxJsonSchema(schema);

            const storageInstance = await storage.createStorageInstance<HumanDocumentType>({
                databaseInstanceToken: randomCouchString(10),
                databaseName: randomCouchString(12),
                collectionName: randomCouchString(12),
                schema,
                options: {},
                multiInstance: false
            });

            await storageInstance.bulkWrite(
                new Array(5).fill(0).map(() => {
                    const data: RxDocumentWriteData<HumanDocumentType> = Object.assign(
                        schemaObjects.human(),
                        {
                            _attachments: {},
                            _deleted: false,
                            _rev: EXAMPLE_REVISION_1,
                            _meta: {
                                lwt: now()
                            }
                        }
                    );
                    data.age = 18;
                    return {
                        document: data
                    }
                }),
                'pouchdb-test'
            );

            const pouch = storageInstance.internals.pouch;
            // const hasIndexes = await pouch.getIndexes();

            async function analyzeQuery(query: MangoQuery<HumanDocumentType>) {
                const preparedQuery = storage.statics.prepareQuery(
                    schema,
                    normalizeMangoQuery(schema, query)
                );
                const explained = await pouch.explain(preparedQuery);
                const result = await pouch.find(preparedQuery);
                return {
                    query,
                    preparedQuery,
                    explained,
                    result: result.docs
                };
            }

            const defaultAnalyzed = await analyzeQuery({
                selector: {},
                sort: [
                    { passportId: 'asc' }
                ]
            });

            const customIndexAnalyzed = await analyzeQuery({
                selector: {},
                sort: [
                    { passportId: 'asc' }
                ],
                index: ['passportId', 'age']
            });

            // default should use default index
            assert.strictEqual(
                defaultAnalyzed.explained.index.ddoc,
                null
            );

            // custom should use the custom index
            (customIndexAnalyzed.query as any).index.forEach((indexKey: string) => {
                if (indexKey !== 'passportId') {
                    assert.ok(ensureNotFalsy(customIndexAnalyzed.explained.index.ddoc).includes(indexKey));
                }
            });
            assert.ok(ensureNotFalsy(customIndexAnalyzed.explained.index.ddoc).includes('_id'));

            // both queries should have returned the same documents
            assert.deepStrictEqual(
                defaultAnalyzed.result,
                customIndexAnalyzed.result
            );

            storageInstance.close();
        });
    });
});
