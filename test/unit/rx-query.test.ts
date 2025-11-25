import assert from 'assert';
import AsyncTestUtil, { assertThrows } from 'async-test-util';
import config, { describeParallel } from './config.ts';
import clone from 'clone';

import {
    schemaObjects,
    schemas,
    humansCollection,
    isNode
} from '../../plugins/test-utils/index.mjs';

import {
    isRxQuery,
    createRxDatabase,
    RxJsonSchema,
    promiseWait,
    randomToken,
    ensureNotFalsy,
    deepFreeze,
    addRxPlugin
} from '../../plugins/core/index.mjs';
import { RxDBUpdatePlugin } from '../../plugins/update/index.mjs';
addRxPlugin(RxDBUpdatePlugin);
import { RxDBQueryBuilderPlugin } from '../../plugins/query-builder/index.mjs';
addRxPlugin(RxDBQueryBuilderPlugin);

import { firstValueFrom } from 'rxjs';

describe('rx-query.test.ts', () => {
    describeParallel('.constructor', () => {
        it('should throw dev-mode error on wrong query object', async () => {
            const col = await humansCollection.create(0);

            await AsyncTestUtil.assertThrows(
                () => col.find({ foo: 'bar' } as any),
                'RxTypeError',
                'no valid query params'
            );

            col.database.close();
        });
        it('should throw error when custom index not in schema indexes', async () => {
            const col = await humansCollection.create(0);
            await AsyncTestUtil.assertThrows(
                () => col.find({
                    selector: {},
                    index: ['f', 'o', 'b', 'a', 'r']
                }).getPreparedQuery(),
                'RxError',
                'not in schem'
            );
            col.database.close();
        });
        it('should NOT throw error when custom index is in schema indexes', async () => {
            const col = await humansCollection.createAgeIndex(0);
            col.find({
                selector: {},
                index: ['age']
            }).getPreparedQuery();
            col.database.close();
        });
    });
    describeParallel('.toJSON()', () => {
        it('should produce the correct selector-object', async () => {
            const col = await humansCollection.create(0);
            const q = col.find()
                .where('firstName').ne('Alice')
                .where('age').gt(18).lt(67)
                .limit(10)
                .sort('-age');
            const queryObj = q.mangoQuery;
            assert.deepStrictEqual(queryObj, {
                selector: {
                    firstName: {
                        '$ne': 'Alice'
                    },
                    age: {
                        '$gt': 18,
                        '$lt': 67
                    }
                },
                sort: [{
                    age: 'desc'
                }],
                limit: 10
            });
            col.database.close();
        });
    });
    describeParallel('.toString()', () => {
        it('should get a valid string-representation', async () => {
            const col = await humansCollection.create(0);
            const q = col.find()
                .where('firstName').ne('Alice')
                .where('age').gt(18).lt(67)
                .limit(10)
                .sort('-age');
            const str = q.toString();
            const mustString = '{"op":"find","other":{"queryBuilderPath":"age"},"query":{"limit":10,"selector":{"age":{"$gt":18,"$lt":67},"firstName":{"$ne":"Alice"}},"skip":0,"sort":[{"age":"desc"},{"passportId":"asc"}]}}';
            assert.strictEqual(str, mustString);
            const str2 = q.toString();
            assert.strictEqual(str2, mustString);

            col.database.close();
        });
        it('should get a valid string-representation with two sort params', async () => {
            const col = await humansCollection.createAgeIndex();
            const q = col.find().sort({
                passportId: 'desc', age: 'desc'
            });
            const str = q.toString();
            const mustString = '{"op":"find","other":{},"query":{"selector":{},"skip":0,"sort":[{"passportId":"desc"},{"age":"desc"}]}}';
            assert.strictEqual(str, mustString);
            const str2 = q.toString();
            assert.strictEqual(str2, mustString);

            col.database.close();
        });
        it('ISSUE #190: should contain the regex', async () => {
            const col = await humansCollection.create(0);
            const queryWithoutRegex = col.find();
            const queryWithRegex = queryWithoutRegex.where('firstName').regex('foobar');
            const queryString = queryWithRegex.toString();

            assert.ok(queryString.includes('foobar'));
            col.database.close();
        });
        it('same queries should return the same string', async () => {
            const col1 = await humansCollection.create(0);
            const col2 = await humansCollection.create(0);

            const query1 = col1.find()
                .where('age').gt(10)
                .where('firstName').ne('foobar')
                .sort('passportId').toString();

            const query2 = col2.find()
                .where('age').gt(10)
                .where('firstName').ne('foobar')
                .sort('passportId').toString();

            assert.strictEqual(query1, query2);
            col1.database.close();
            col2.database.close();
        });
        it('same queries should return the same string even if on same collection', async () => {
            const col = await humansCollection.create(0);

            const query1 = col.find()
                .where('age').gt(10)
                .where('firstName').ne('foobar')
                .sort('passportId').toString();

            const query2 = col.find()
                .where('age').gt(10)
                .where('firstName').ne('foobar')
                .sort('passportId').toString();

            assert.strictEqual(query1, query2);
            col.database.close();
        });
    });
    describeParallel('immutable', () => {
        it('should not be the same object (sort)', async () => {
            const col = await humansCollection.create(0);
            const q = col.find()
                .where('firstName').ne('Alice')
                .where('age').gt(18).lt(67)
                .limit(10)
                .sort('-age');
            const q2 = q.sort('firstName');
            assert.ok(isRxQuery(q2));
            assert.notStrictEqual(q, q2);
            col.database.close();
        });
        it('should not be the same object (where)', async () => {
            const col = await humansCollection.create(0);
            const q = col.find()
                .where('firstName').ne('Alice')
                .where('age').gt(18).lt(67)
                .limit(10)
                .sort('-age');
            const q2 = q.where('firstName').eq('foobar');
            assert.ok(isRxQuery(q2));
            assert.notStrictEqual(q, q2);
            assert.ok(q.id < q2.id);
            col.database.close();
        });
    });
    describeParallel('QueryCache.js', () => {
        it('return the same object', async () => {
            const col = await humansCollection.create(0);
            const q = col.find()
                .where('firstName').ne('Alice')
                .where('age').gt(18).lt(67)
                .limit(10)
                .sort('-age');
            const q2 = col.find()
                .where('firstName').ne('Alice')
                .where('age').gt(18).lt(67)
                .limit(10)
                .sort('-age');

            assert.deepStrictEqual(q, q2);
            assert.strictEqual(q.id, q2.id);
            col.database.close();
        });
        it('should return the same object after exec', async () => {
            const col = await humansCollection.createPrimary(0);
            const docData = schemaObjects.simpleHumanData();
            await col.insert(docData);
            const query = col.findOne(docData.passportId);
            await query.exec();
            const query2 = col.findOne(docData.passportId);
            await query2.exec();
            assert.strictEqual(query.id, query2.id);
            col.database.close();
        });
        it('should have the correct amount of cached queries', async () => {
            const col = await humansCollection.create(0);
            const q3 = col.find()
                .where('firstName').ne('Bob');
            assert.ok(q3);
            const q = col.find()
                .where('firstName').ne('Alice');
            assert.ok(q);
            const q2 = col.find()
                .where('firstName').ne('Bob');
            assert.ok(q2);
            assert.strictEqual(col._queryCache._map.size, 4);
            col.database.close();
        });
        it('return another object', async () => {
            const col = await humansCollection.create(0);
            const q = col.find()
                .where('firstName').ne('Alice')
                .where('age').gt(18).lt(67)
                .limit(10)
                .sort('-age');
            const q2 = col.find()
                .where('firstName').ne('foobar')
                .where('age').gt(18).lt(67)
                .limit(10)
                .sort('-age');

            assert.notStrictEqual(q, q2);
            assert.notStrictEqual(q.id, q2.id);
            col.database.close();
        });
        it('ISSUE: ensure its the same query', async () => {
            const col = await humansCollection.create(0);

            const query1 = col.find()
                .where('age').gt(10)
                .where('firstName').ne('foobar')
                .sort('passportId');

            const query2 = col.find()
                .where('age').gt(10)
                .where('firstName').ne('foobar')
                .sort('passportId');

            assert.ok(query1 === query2);
            col.database.close();
        });

        it('should distinguish between different sort-orders', async () => {
            const col = await humansCollection.create(0);
            const q = col.find()
                .where('firstName').ne('Alice')
                .where('age').gt(18).lt(67)
                .limit(10)
                .sort('-age')
                .sort('firstName');
            const q2 = col.find()
                .where('firstName').ne('Alice')
                .where('age').gt(18).lt(67)
                .limit(10)
                .sort('firstName')
                .sort('-age');

            assert.notStrictEqual(q, q2);
            assert.notStrictEqual(q.id, q2.id);
            col.database.close();
        });
    });
    describeParallel('result caching', () => {
        /**
         * The object stored in the query cache should be
         * exact the same as the object used in a document data.
         * This ensures that we do not use double the memory
         * by storing the data multiple times.
         */
        it('should reuse the cached result object in the document', async () => {
            const col = await humansCollection.create(1);
            const query = col.find({
                selector: {
                    firstName: {
                        $ne: 'foobar'
                    }
                }
            });
            const docs = await query.exec();
            const doc = docs[0];
            if (!doc) {
                throw new Error('doc missing');
            }

            const docDataObject = doc._data;
            const inQueryCacheObject = ensureNotFalsy(query._result).docsData[0];

            assert.ok(
                docDataObject === inQueryCacheObject
            );

            col.database.close();
        });
    });
    describeParallel('.doesDocMatchQuery()', () => {
        it('should match', async () => {
            const col = await humansCollection.create(0);
            const q = col.find().where('firstName').ne('foobar');
            const docData = schemaObjects.humanData();
            assert.ok(q.doesDocumentDataMatch(docData));
            col.database.close();
        });
        it('should not match', async () => {
            const col = await humansCollection.create(0);
            const q = col.find().where('firstName').ne('foobar');
            const docData = schemaObjects.humanData();
            docData.firstName = 'foobar';
            assert.strictEqual(false, q.doesDocumentDataMatch(docData));
            col.database.close();
        });
        it('should match ($gt)', async () => {
            const col = await humansCollection.create(0);
            const q = col.find().where('age').gt(1);
            const docData = schemaObjects.humanData();
            docData.age = 5;
            assert.ok(q.doesDocumentDataMatch(docData));
            col.database.close();
        });
        it('should not match ($gt)', async () => {
            const col = await humansCollection.create(0);
            const q = col.find().where('age').gt(100);
            const docData = schemaObjects.humanData();
            docData.age = 5;
            assert.strictEqual(false, q.doesDocumentDataMatch(docData));
            col.database.close();
        });
        it('BUG: this should match', async () => {
            const col = await humansCollection.create(0);
            const q = col.find();

            const docData = {
                passportId: 'foobar',
                color: 'green',
                hp: 100,
                maxHP: 767,
                name: 'asdfsadf',
                _rev: '1-971bfd0b8749eb33b6aae7f6c0dc2cd4'
            };

            assert.strictEqual(true, q.doesDocumentDataMatch(docData));
            col.database.close();
        });
    });
    describeParallel('.exec()', () => {
        it('reusing exec should not make a execOverDatabase', async () => {
            const col = await humansCollection.create(2);
            const q = col.find().where('passportId').ne('Alice');


            let results = await q.exec();
            assert.strictEqual(results.length, 2);
            assert.strictEqual(q._execOverDatabaseCount, 1);

            await promiseWait(5);
            results = await q.exec();
            assert.strictEqual(results.length, 2);
            assert.strictEqual(q._execOverDatabaseCount, 1);

            col.database.close();
        });
        it('should execOverDatabase when still subscribed and changeEvent comes in', async () => {
            const col = await humansCollection.create(0);

            await col.bulkInsert([
                schemaObjects.humanData('aaa'),
                schemaObjects.humanData('bbb')
            ]);


            /**
             * This query can never handled by event-reduce
             * because we later insert a new document at the bottom
             */
            const query = col.find({
                selector: {},
                sort: [{ passportId: 'desc' }],
                limit: 1
            });

            const fired: any[] = [];
            const sub1 = query.$.subscribe(res => {
                fired.push(res);
            });
            await AsyncTestUtil.waitUntil(() => fired.length === 1, 1000);

            assert.strictEqual(query._execOverDatabaseCount, 1);
            assert.strictEqual(query._latestChangeEvent, 2);

            const addObj = schemaObjects.humanData('zzz');
            await col.insert(addObj);
            assert.strictEqual(query.collection._changeEventBuffer.getCounter(), 3);

            await AsyncTestUtil.waitUntil(() => query._latestChangeEvent === 3, 1000);
            assert.strictEqual(query._latestChangeEvent, 3);

            await AsyncTestUtil.waitUntil(() => {
                return fired.length === 2;
            }, 1000);
            assert.strictEqual(fired[1].pop().passportId, addObj.passportId);
            sub1.unsubscribe();
            col.database.close();
        });
        it('reusing exec should execOverDatabase when change happened that cannot be optimized', async () => {
            const col = await humansCollection.create(2);

            // it is assumed that this query can never handled by event-reduce
            const q = col.find()
                .where('firstName').ne('AliceFoobar')
                .sort('passportId')
                .skip(1);

            let results = await q.exec();
            assert.strictEqual(results.length, 1);
            assert.strictEqual(q._execOverDatabaseCount, 1);
            assert.strictEqual(q._latestChangeEvent, 2);

            const addDoc = schemaObjects.humanData();

            // set _id to first value to force a re-exec-over database
            addDoc.passportId = '1-aaaaaaaaaaaaaaaaaaaaaaaaaaa';
            addDoc.firstName = 'NotAliceFoobar';

            await col.insert(addDoc);
            assert.strictEqual(q.collection._changeEventBuffer.getCounter(), 3);

            assert.strictEqual(q._latestChangeEvent, 2);

            await promiseWait(1);
            results = await q.exec();
            assert.strictEqual(results.length, 2);
            assert.strictEqual(q._execOverDatabaseCount, 2);

            col.database.close();
        });
        it('querying fast should still return the same RxDocument', async () => {
            if (
                !isNode
            ) {
                return;
            }
            // use a 'slow' adapter because memory might be to fast
            const db = await createRxDatabase({
                name: randomToken(10),
                storage: config.storage.getStorage(),
            });
            const cols = await db.addCollections({
                humans: {
                    schema: schemas.human
                }
            });
            const c = cols.humans;
            await c.insert(schemaObjects.humanData());

            const query1 = c.findOne().where('age').gt(0);
            const query2 = c.findOne().where('age').gt(1);
            const docs = await Promise.all([
                query1.exec(),
                query2.exec()
            ]);
            assert.ok(docs[0] === docs[1]);

            db.close();
        });
        it('querying after insert should always return the correct amount', async () => {
            const col = await humansCollection.create(0);

            const amount = 50;
            const query = col.find({
                selector: {
                    age: {
                        $gt: 1
                    }
                }
            });
            let inserted = 0;
            while (inserted < amount) {
                const docData = schemaObjects.humanData();
                docData.age = 10;
                await col.insert(docData);
                inserted = inserted + 1;
                const results = await query.exec();
                assert.strictEqual(results.length, inserted);
            }

            col.database.close();
        });
        it('should not make more requests then needed', async () => {
            const col = await humansCollection.createPrimary(0);
            const docData = schemaObjects.simpleHumanData();
            const otherData = () => {
                const data = clone(docData);
                data.firstName = AsyncTestUtil.randomString();
                return data;
            };
            await col.insert(docData);

            const emitted = [];
            const query = col.findOne(docData.passportId);
            query.$.subscribe((data: any) => emitted.push(data.toJSON()));

            await AsyncTestUtil.waitUntil(() => emitted.length === 1);
            assert.strictEqual(query._execOverDatabaseCount, 1);

            const doc = await query.exec();
            assert.ok(doc);
            assert.strictEqual(query._execOverDatabaseCount, 1);

            await col.upsert(otherData());
            await AsyncTestUtil.waitUntil(() => emitted.length === 2);
            assert.strictEqual(query._execOverDatabaseCount, 1);

            await col.incrementalUpsert(otherData());
            await AsyncTestUtil.waitUntil(() => emitted.length === 3);
            assert.strictEqual(query._execOverDatabaseCount, 1);

            await Promise.all(
                new Array(2)
                    .fill(0)
                    .map(() => otherData())
                    .map(data => col.incrementalUpsert(data))
            );
            await AsyncTestUtil.waitUntil(() => emitted.length === 5);
            assert.strictEqual(query._execOverDatabaseCount, 1);

            await Promise.all(
                new Array(10)
                    .fill(0)
                    .map(() => otherData())
                    .map(data => col.incrementalUpsert(data))
            );
            await AsyncTestUtil.waitUntil(() => emitted.length === 15);
            assert.strictEqual(query._execOverDatabaseCount, 1);

            col.database.close();
        });
        it('should not make more requests then needed on incremental upsert', async () => {
            const col = await humansCollection.createPrimary(0);
            const docData = schemaObjects.simpleHumanData();
            let count = 0;
            const otherData = () => {
                const data = clone(docData);
                data.firstName = '' + count;
                count++;
                return data;
            };

            const emitted = [];
            const query = col.findOne(docData.passportId);
            query.$.subscribe(doc => {
                if (!doc) emitted.push(null);
                else emitted.push(doc.toJSON());
            });

            await Promise.all(
                new Array(10)
                    .fill(0)
                    .map(() => otherData())
                    .map(data => col.incrementalUpsert(data))
            );

            assert.strictEqual(query._execOverDatabaseCount, 1);
            col.database.close();
        });
        it('exec from other database-instance', async () => {
            if (!config.storage.hasPersistence) {
                return;
            }
            const dbName = randomToken(10);
            const schema = schemas.averageSchema();
            const db = await createRxDatabase({
                name: dbName,
                eventReduce: true,
                storage: config.storage.getStorage(),
            });
            const cols = await db.addCollections({
                human: {
                    schema
                }
            });
            const col = cols.human;

            await Promise.all(
                new Array(10)
                    .fill(0)
                    .map(() => schemaObjects.averageSchemaData())
                    .map(data => col.insert(data))
            );

            await db.close();

            const db2 = await createRxDatabase({
                name: dbName,
                storage: config.storage.getStorage(),
                eventReduce: true,
                ignoreDuplicate: true
            });
            const cols2 = await db2.addCollections({
                human: {
                    schema
                }
            });
            const col2 = cols2.human;

            const allDocs = await col2.find().exec();
            assert.strictEqual(allDocs.length, 10);

            db2.close();
        });
        it('exec(true) should throw if missing', async () => {
            const c = await humansCollection.create(0);

            await AsyncTestUtil.assertThrows(
                () => c.findOne().exec(true),
                'RxError',
                'throwIfMissing'
            );

            c.database.close();
        });
        it('exec(true) should throw used with non-findOne', async () => {
            const c = await humansCollection.create(0);
            await AsyncTestUtil.assertThrows(
                () => c.find().exec(true),
                'RxError',
                'findOne'
            );
            c.database.close();
        });
        it('isFindOneByIdQuery(): .findOne(documentId) should use RxStorage().findDocumentsById() instead of RxStorage().query()', async () => {
            const c = await humansCollection.create();
            const docData = schemaObjects.humanData();
            const docId = 'foobar';
            docData.passportId = docId;
            await c.insert(docData);


            // overwrite .query() to track the amount of calls
            let queryCalls = 0;
            const queryBefore = c.storageInstance.query.bind(c.storageInstance);
            c.storageInstance.query = function (preparedQuery) {
                queryCalls = queryCalls + 1;
                return queryBefore(preparedQuery);
            };

            /**
             * None of these operations should lead to a call to .query()
             */
            const operations = [
                () => c.findOne(docId).exec(true),
                () => c.find({
                    selector: {
                        passportId: docId
                    },
                    limit: 1
                }).exec(),
                () => c.find({
                    selector: {
                        passportId: {
                            $eq: docId
                        }
                    },
                    limit: 1
                }).exec(),
                () => c.find({
                    selector: {
                        passportId: {
                            $eq: docId
                        }
                    }
                    /**
                     * Even without limit here,
                     * it should detect that we look for a document that is $eq
                     * to the primary key, so it can always
                     * only find one document.
                     */
                }).exec(),
                // same with id arrays
                () => c.find({
                    selector: {
                        passportId: {
                            $in: [
                                docId,
                                'foobar'
                            ]
                        }
                    },
                })
            ];
            for (const operation of operations) {
                await operation();
            }

            assert.strictEqual(queryCalls, 0);
            c.database.close();
        });
    });
    describeParallel('updates to the result of the query', () => {
        describe('RxQuery.update()', () => {
            it('updates a value on a query', async () => {
                const c = await humansCollection.create(2);
                const query = c.find();
                const updateResult = await query.update({
                    $set: {
                        firstName: 'new first name'
                    }
                });
                assert.strictEqual(updateResult.length, 2);

                // the returned docs must the at the "latest" revision
                for (const doc of updateResult) {
                    const latest = doc.getLatest();
                    assert.ok(latest === doc, 'doc must be latest');
                    assert.strictEqual(doc.isInstanceOfRxDocument, true);
                }
                const docs = await query.exec();
                for (const doc of docs) {
                    assert.strictEqual(doc._data.firstName, 'new first name');
                    assert.strictEqual(doc.isInstanceOfRxDocument, true);
                }
                c.database.close();
            });
            it('$unset a value on a query', async () => {
                const c = await humansCollection.create(2);
                const query = c.find();
                await query.update({
                    $unset: {
                        age: ''
                    }
                });
                const docs = await query.exec();
                for (const doc of docs)
                    assert.strictEqual(doc._data.age, undefined);
                c.database.close();
            });
            it('dont crash when findOne with no result', async () => {
                const c = await humansCollection.create(2);
                const query = c.findOne().where('age').gt(1000000);
                const updateResult = await query.update({
                    $set: {
                        firstName: 'new first name'
                    }
                });
                assert.strictEqual(updateResult, null);
                const doc = await query.exec();
                assert.strictEqual(doc, null);
                c.database.close();
            });
            it('update and remove in one atomic write', async () => {
                const c = await humansCollection.create(2);
                const query = c.find().where('age').gt(-1);
                const updateResult = await query.update({
                    $set: {
                        firstName: 'aaa',
                        _deleted: true,
                    }
                });

                updateResult.forEach(d => {
                    assert.strictEqual(d.firstName, 'aaa');
                    assert.ok(d.deleted);
                });

                const docsAfter = await c.find().exec();
                assert.strictEqual(docsAfter.length, 0);

                c.database.close();
            });
        });
        describe('RxQuery.patch()', () => {
            it('updates a value on a query', async () => {
                const c = await humansCollection.create(2);
                const query = c.find();
                const updateResult = await query.patch({
                    firstName: 'new first name'
                });
                // the returned docs must the at the "latest" revision
                for (const doc of updateResult) {
                    const latest = doc.getLatest();
                    assert.ok(latest === doc, 'doc must be latest');
                    assert.strictEqual(doc.isInstanceOfRxDocument, true);
                }
                const docs = await query.exec();
                for (const doc of docs) {
                    assert.strictEqual(doc._data.firstName, 'new first name');
                    assert.strictEqual(doc.isInstanceOfRxDocument, true);
                }
                c.database.close();
            });
            it('dont crash when findOne with no result', async () => {
                const c = await humansCollection.create(2);
                const query = c.findOne().where('age').gt(1000000);
                await query.patch({
                    firstName: 'new first name'
                });
                const doc = await query.exec();
                assert.strictEqual(doc, null);
                c.database.close();
            });
        });
        describe('RxQuery.modify()', () => {
            it('updates a value on a query', async () => {
                const c = await humansCollection.create(2);
                const query = c.find();
                const updateResult = await query.modify(docData => {
                    docData.firstName = 'new first name';
                    return docData;
                });
                // the returned docs must the at the "latest" revision
                for (const doc of updateResult) {
                    const latest = doc.getLatest();
                    assert.ok(latest === doc, 'doc must be latest');
                    assert.strictEqual(doc.isInstanceOfRxDocument, true);
                }
                const docs = await query.exec();
                for (const doc of docs) {
                    assert.strictEqual(doc._data.firstName, 'new first name');
                    assert.strictEqual(doc.isInstanceOfRxDocument, true);
                }
                c.database.close();
            });
            it('unset a value on a query', async () => {
                const c = await humansCollection.create(2);
                const query = c.find();
                await query.modify(d => {
                    delete d.age;
                    return d;
                });
                const docs = await query.exec();
                for (const doc of docs) {
                    assert.strictEqual(doc._data.age, undefined);
                }
                c.database.close();
            });
        });
        describe('incremental functions', () => {
            it('.incrementalPatch()', async () => {
                const c = await humansCollection.create(2);
                const query = c.find();
                const updateResult = await query.incrementalPatch({
                    firstName: 'new first name'
                });
                // the returned docs must the at the "latest" revision
                for (const doc of updateResult) {
                    const latest = doc.getLatest();
                    assert.ok(latest === doc, 'doc must be latest');
                    assert.strictEqual(doc.isInstanceOfRxDocument, true);
                }
                const docs = await query.exec();
                for (const doc of docs) {
                    assert.strictEqual(doc._data.firstName, 'new first name');
                    assert.strictEqual(doc.isInstanceOfRxDocument, true);
                }
                c.database.close();
            });
            it('.incrementalModify()', async () => {
                const c = await humansCollection.create(2);
                const query = c.find();
                const updateResult = await query.incrementalModify(docData => {
                    docData.firstName = 'new first name';
                    return docData;
                });
                // the returned docs must the at the "latest" revision
                for (const doc of updateResult) {
                    const latest = doc.getLatest();
                    assert.ok(latest === doc, 'doc must be latest');
                    assert.strictEqual(doc.isInstanceOfRxDocument, true);
                }
                const docs = await query.exec();
                for (const doc of docs) {
                    assert.strictEqual(doc._data.firstName, 'new first name');
                    assert.strictEqual(doc.isInstanceOfRxDocument, true);
                }
                c.database.close();
            });
        });
    });
    describeParallel('issues', () => {
        /**
         * @link https://github.com/pubkey/rxdb/pull/7497
         */
        it('#7497 findOne subscription + exec does not return correct result', async () => {
            const c = await humansCollection.create(1);
            const doc = await c.findOne().exec(true);
            const query = c.findOne().sort({ age: 'asc' });

            const subscription = query.$.subscribe(() => {
            });

            await doc.remove();

            const foundDoc = await query.exec();


            if (foundDoc !== null) {
                throw new Error(
                    'BUG REPRODUCED: Query returned a document when it should return null after removal. Document: ' +
                    JSON.stringify(foundDoc?.toJSON())
                );
            }

            subscription.unsubscribe();
            c.database.close();
        });
        /**
         * @link https://github.com/pubkey/rxdb/issues/6792#issuecomment-2624555824
         */
        it('#6792 queries must never contain an undefined property', async () => {
            const c = await humansCollection.create(0);

            await assertThrows(
                () => c.find({
                    selector: {
                        firstName: undefined
                    }
                }).exec(),
                'RxError',
                'QU19'
            );

            await assertThrows(
                () => c.find({
                    selector: {
                        firstName: {
                            $eq: undefined
                        }
                    }
                }).exec(),
                'RxError',
                'QU19'
            );

            c.database.close();
        });
        it('#278 queryCache breaks when pointer out of bounds', async () => {
            if (config.storage.name === 'sqlite-trial') {
                return;
            }
            const c = await humansCollection.createPrimary(0);

            // insert some docs
            const insertAmount = 100;
            await c.bulkInsert(
                new Array(insertAmount)
                    .fill(0)
                    .map((_v, idx) => schemaObjects.humanData(undefined, idx))
            );

            // make and exec query
            const query = c.find();
            const docs = await query.exec();
            assert.strictEqual(docs.length, insertAmount);

            // produces changeEvents
            await c.bulkInsert(
                new Array(300) // higher than ChangeEventBuffer.limit
                    .fill(0)
                    .map(() => schemaObjects.humanData())
            );

            // re-exec query
            const docs2 = await query.exec();
            assert.strictEqual(docs2.length, 400);

            // try same with upserts
            const docData = new Array(200)
                .fill(0)
                .map(() => schemaObjects.humanData());
            await c.bulkInsert(docData);

            const docs3 = await query.exec();
            assert.strictEqual(docs3.length, 600);

            let docData2 = clone(docData);
            // because we have no bulkUpsert, we only upsert 10 docs to speed up the test.
            docData2 = docData2.slice(0, 10);
            docData2.forEach((doc: any) => doc.lastName = doc.lastName + '1');
            await Promise.all(
                docData2.map(doc => c.upsert(doc))
            );

            const docs4 = await query.exec();
            assert.strictEqual(docs4.length, 600);

            c.database.remove();
        });
        it('#585 sort by sub-path not working', async () => {
            const schema = {
                version: 0,
                type: 'object',
                primaryKey: 'id',
                keyCompression: false,
                properties: {
                    id: {
                        type: 'string',
                        maxLength: 100
                    },
                    info: {
                        type: 'object',
                        properties: {
                            title: {
                                type: 'string',
                                maxLength: 100
                            },
                        },
                    }
                },
                indexes: ['info.title']
            };
            const db = await createRxDatabase({
                name: randomToken(10),
                storage: config.storage.getStorage(),
            });
            const cols = await db.addCollections({
                humans: {
                    schema
                }
            });
            const col = cols.humans;

            await col.insert({
                id: '1',
                info: {
                    title: 'bbtest'
                }
            });
            await col.insert({
                id: '2',
                info: {
                    title: 'aatest'
                }
            });
            await col.insert({
                id: '3',
                info: {
                    title: 'cctest'
                }
            });

            const query = col
                .find()
                .sort('info.title');
            const foundDocs = await query.exec();
            assert.strictEqual(foundDocs.length, 3);
            assert.strictEqual(foundDocs[0].info.title, 'aatest');

            const foundDocsDesc = await col
                .find()
                .sort('-info.title')
                .exec();
            assert.strictEqual(foundDocsDesc.length, 3);
            assert.strictEqual(foundDocsDesc[0].info.title, 'cctest');

            db.remove();
        });
        it('#698 Same query producing a different result', async () => {
            const mySchema: RxJsonSchema<{ id: string; event_id: number; user_id: string; created_at: number; }> = {
                version: 0,
                keyCompression: false,
                primaryKey: 'id',
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        maxLength: 100
                    },
                    event_id: {
                        type: 'number'
                    },
                    user_id: {
                        type: 'string'
                    },
                    created_at: {
                        type: 'number',
                        minimum: 0,
                        maximum: 10000000000000000,
                        multipleOf: 1
                    }
                },
                indexes: ['created_at'],
                required: ['created_at']
            };
            const collection = await humansCollection.createBySchema(mySchema);

            await collection.insert({
                id: randomToken(12),
                event_id: 1,
                user_id: '6',
                created_at: 1337
            });
            await collection.insert({
                id: randomToken(12),
                event_id: 2,
                user_id: '6',
                created_at: 1337
            });


            const selector = {
                $and: [{
                    event_id: {
                        $eq: 2
                    }
                }, {
                    user_id: {
                        $eq: '6'
                    }
                },
                {
                    created_at: {
                        $gt: 0
                    }
                }, {
                    user_id: {
                        $eq: '6'
                    }
                },
                {
                    created_at: {
                        $gt: 0
                    }
                }
                ]
            };

            const resultDocs1 = await collection
                .find({
                    selector
                })
                .exec();
            const resultData1: any[] = resultDocs1.map(doc => doc.toJSON());

            const resultDocs2 = await collection
                .find()
                .where('event_id').eq(2)
                .where('user_id').eq('6')
                .where('created_at').gt(0)
                .exec();
            const resultData2 = resultDocs2.map(doc => doc.toJSON());

            assert.strictEqual(resultData1.length, 1);
            assert.strictEqual(resultData1[0]['event_id'], 2);
            assert.deepStrictEqual(resultData1, resultData2);

            collection.database.close();
        });
        it('698#issuecomment-402604237 mutating a returned array should not affect exec-calls afterwards', async () => {
            const c = await humansCollection.create(2);
            const query = c.find();

            // exec-calls
            const result1: any = await query.exec();
            assert.strictEqual(result1.length, 2);
            result1.push({
                foo: 'bar'
            });
            const result2 = await query.exec();
            assert.strictEqual(result2.length, 2);

            c.database.close();

            // subscriptions
            const c2 = await humansCollection.create(2);
            const query2 = c2.find();
            const res1: any = await firstValueFrom(query2.$);
            res1.push({
                foo: 'bar'
            });
            const res2 = await firstValueFrom(query2.$);
            assert.strictEqual(res2.length, 2);

            c2.database.close();
        });
        it('#815 Allow null value for strings', async () => {
            // create a schema
            const mySchema = {
                version: 0,
                primaryKey: 'passportId',
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
                        type: ['string', 'null']
                    },
                    age: {
                        type: 'integer',
                        minimum: 0,
                        maximum: 150
                    }
                }
            };

            // generate a random database-name
            const name = randomToken(10);

            // create a database
            const db = await createRxDatabase({
                name,
                storage: config.storage.getStorage(),
                eventReduce: true,
                ignoreDuplicate: true
            });
            // create a collection
            const collections = await db.addCollections({
                mycollection: {
                    schema: mySchema
                }
            });
            const collection = collections.mycollection;

            // insert a document
            await collection.insert({
                passportId: 'foobar',
                firstName: 'Bob1',
                age: 56
            });
            await collection.insert({
                passportId: 'foobaz',
                firstName: 'Bob2',
                lastName: null,
                age: 56
            });

            const queryOK = collection.find();
            const docsOK = await queryOK.exec();
            assert.strictEqual(docsOK.length, 2);

            db.close();
        });
        /**
         * via gitter at 11 November 2019 10:10
         */
        it('gitter: query with regex does not return correct results', async () => {
            // create a schema
            const mySchema = {
                version: 0,
                primaryKey: 'passportId',
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
                        type: ['string', 'null']
                    }
                }
            };
            const db = await createRxDatabase({
                name: randomToken(10),
                storage: config.storage.getStorage(),
                eventReduce: true,
                ignoreDuplicate: true
            });

            // create a collection
            const collections = await db.addCollections({
                mycollection: {
                    schema: mySchema
                }
            });
            const collection = collections.mycollection;

            // insert documents
            await collection.bulkInsert([
                {
                    passportId: 'doc1',
                    firstName: 'John',
                    lastName: 'Doe'
                }, {
                    passportId: 'doc2',
                    firstName: 'Martin',
                    lastName: 'Smith'
                }
            ]);
            const allDocs = await collection.find().exec();
            assert.strictEqual(allDocs.length, 2);

            // test 1 with RegExp object
            const result1 = await collection.find({
                selector: {
                    lastName: {
                        $regex: '^Doe$',
                        $options: 'i'
                    }
                }
            }).exec();

            // test 2 with regex string
            const result2 = await collection.find({
                selector: {
                    lastName: { $regex: '^Doe$' }
                }
            }).exec();


            // both results should only have the doc1
            assert.strictEqual(result1.length, 1);
            assert.strictEqual(result1[0].passportId, 'doc1');
            assert.deepStrictEqual(
                result1.map(d => d.toJSON()),
                result2.map(d => d.toJSON())
            );

            db.remove();
        });
        it('#2071 RxCollection.findOne().exec() returns deleted document while find().exec() not', async () => {
            const c = await humansCollection.create(1);

            // delete it
            const doc = await c.findOne();
            await doc.remove();

            // now find() returns empty array
            const docs = await c.find().exec();
            assert.strictEqual(docs.length, 0);

            // findOne() still returns the deleted object
            const doc2 = await c.findOne().exec();
            assert.strictEqual(doc2, null);

            c.database.remove();
        });
        it('#2213 prepareQuery should handle all comparison operators', async () => {
            const collection = await humansCollection.createAgeIndex(0);
            await collection.insert({
                passportId: 'foobar',
                firstName: 'Bob',
                lastName: 'Kelso',
                age: 56
            });

            await collection.insert({
                passportId: 'foobar2',
                firstName: 'Bob2',
                lastName: 'Kelso2',
                age: 58
            });

            const myDocument = await collection.findOne({
                selector: {
                    age: {
                        $gte: 57,
                    },
                },
                sort: [{ age: 'asc' }]
            }).exec(true);

            assert.strictEqual(myDocument.age, 58);

            collection.database.remove();
        });
        it('should not mutate the query input', async () => {
            const db = await createRxDatabase({
                name: randomToken(10),
                storage: config.storage.getStorage(),
                eventReduce: false
            });
            const schema = clone(schemas.human);
            schema.keyCompression = false;

            const cols = await db.addCollections({
                humans: {
                    schema
                }
            });
            const c = cols.humans;



            const docDataMatching = schemaObjects.humanData('docMatching');
            docDataMatching.age = 42;
            await c.insert(docDataMatching);

            const docDataNotMatching = schemaObjects.humanData('docNotMatching');
            docDataNotMatching.age = 99;
            await c.insert(docDataNotMatching);

            /**
             * Deep freeze the params so that it will throw
             * at the first place it is mutated.
             */
            const queryParams = deepFreeze({
                selector: {
                    age: 42
                }
            });
            const queryMatching = c.find(queryParams);
            const queryMatchingOne = c.findOne(queryParams);
            if (queryMatching.mangoQuery.limit) {
                throw new Error('queryMatching must not have a limit ' + JSON.stringify(queryMatching.mangoQuery));
            }
            const res1 = await queryMatching.exec();
            const resOne1 = await queryMatchingOne.exec();
            assert.strictEqual(res1.length, 1);
            assert.ok(resOne1);
            assert.strictEqual(resOne1.age, 42);
            db.close();
        });
        /**
        * via gitter @sfordjasiri 27.8.2020 10:27
        */

        it('gitter: mutating find-params causes different results', async () => {
            const db = await createRxDatabase({
                name: randomToken(10),
                storage: config.storage.getStorage(),
                eventReduce: false
            });
            const schema = clone(schemas.human);
            schema.keyCompression = false;

            const cols = await db.addCollections({
                humans: {
                    schema
                }
            });
            const c = cols.humans;



            const docDataMatching = schemaObjects.humanData('docMatching');
            docDataMatching.age = 42;
            await c.insert(docDataMatching);

            const docDataNotMatching = schemaObjects.humanData('docNotMatching');
            docDataNotMatching.age = 99;
            await c.insert(docDataNotMatching);


            const queryParams = {
                selector: {
                    age: 42
                }
            };
            const queryMatching = c.find(queryParams);
            const queryMatchingOne = c.findOne(queryParams);
            if (queryMatching.mangoQuery.limit) {
                throw new Error('queryMatching must not have a limit ' + JSON.stringify(queryMatching.mangoQuery));
            }
            const res1 = await queryMatching.exec();
            const resOne1 = await queryMatchingOne.exec();
            assert.strictEqual(res1.length, 1);
            assert.ok(resOne1);
            assert.strictEqual(resOne1.age, 42);

            queryParams.selector.age = 0;

            // trigger a write so the results are not cached
            const addData = schemaObjects.humanData('a-trigger-write');
            addData.age = 55;
            await c.insert(addData);

            const res2 = await queryMatching.exec();
            const resOne2 = await queryMatchingOne.exec();

            assert.strictEqual(res2.length, 1);
            assert.ok(res2);
            assert.strictEqual(resOne2.age, 42);

            db.close();
        });

        it('#3498 RxQuery returns outdated result in second subscription', async () => {
            const schema = {
                version: 0,
                primaryKey: 'id',
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        maxLength: 100
                    },
                    field: {
                        type: 'boolean'
                    }
                }
            } as const;
            const db = await createRxDatabase({
                name: randomToken(10),
                storage: config.storage.getStorage(),
                eventReduce: true,
                ignoreDuplicate: true
            });
            const collection = (await db.addCollections({
                collection: {
                    schema
                }
            })).collection;

            const doc = await collection.insert({ id: 'testid', field: false });

            // Bug only happens the second time the query is used
            const result1 = await collection.find({ selector: { field: false } }).exec();
            assert.strictEqual(result1.length, 1);

            await doc.update({
                $set: {
                    field: true
                }
            });

            const obs = collection.find({ selector: { field: false } }).$;
            const result2a: any[][] = [];
            const result2b: any[][] = [];
            const sub2 = obs.subscribe((d) => result2b.push(d));
            const sub1 = obs.subscribe((d) => result2a.push(d));

            await promiseWait(5);

            sub1.unsubscribe();
            sub2.unsubscribe();

            assert.strictEqual(Math.max(...result2a.map(r => r.length)), 0);
            assert.strictEqual(Math.max(...result2b.map(r => r.length)), 0);

            db.close();
        });
        it('#3631 Sorting a query adds in deleted documents', async () => {
            const c = await humansCollection.createAgeIndex(1);
            const doc = await c.findOne().exec(true);
            await doc.remove();

            const queryResult = await c.find({
                selector: {},
                sort: [
                    { age: 'asc' }
                ]
            }).exec();

            // should not have found the deleted document
            assert.strictEqual(queryResult.length, 0);

            c.database.close();
        });
        it('#4552 $elemMatch query not working when there are many documents in the collection', async () => {
            const c = await humansCollection.createNested(100);
            const result = await c.find({
                selector: {
                    mainSkill: {
                        $elemMatch: {
                            name: {
                                $eq: 'foobar'
                            }
                        }
                    }
                }
            }).exec();
            assert.strictEqual(result.length, 0);
            c.database.remove();
        });
        it('#4586 query-builder copies other param', async () => {
            const col = await humansCollection.create(0);
            const q = col.find();
            const key = 'some-plugin-key';
            const data = 'some-plugin-data';
            q.other[key] = data;

            const newQ = q.where('firstName').ne('Alice');

            assert.strictEqual(newQ.other[key], data);

            col.database.close();
        });
        it('#4773 should not return deleted documents when queried by a primary key', async () => {
            const c = await humansCollection.create();
            const docData = schemaObjects.humanData();
            await c.insert(docData);
            const doc = await c.findOne(docData.passportId).exec();
            assert.ok(doc);
            await c.findOne(docData.passportId).remove();
            const doc2 = await c.findOne(docData.passportId).exec();
            assert.strictEqual(doc2, null);
            const doc3 = await c.findOne({ selector: { passportId: { $eq: [docData.passportId] } } }).exec();
            assert.strictEqual(doc3, null);
            const docs = await c.find({ selector: { passportId: docData.passportId } }).exec();
            assert.strictEqual(docs.length, 0);
            c.database.close();
        });
        it('primaryKey with value "constructor", breaks .findOne()', async () => {
            const mySchema = {
                version: 0,
                primaryKey: 'passportId',
                type: 'object',
                properties: {
                    passportId: {
                        type: 'string',
                        maxLength: 100
                    }
                }
            };
            const db = await createRxDatabase({
                name: randomToken(10),
                storage: config.storage.getStorage(),
                eventReduce: true,
                ignoreDuplicate: true
            });

            // create a collection
            const collections = await db.addCollections({
                mycollection: {
                    schema: mySchema
                }
            });
            const collection = collections.mycollection;

            let has = await collection.findOne('constructor').exec();
            assert.ok(!has);
            has = await collection.findOne('toString').exec();
            assert.ok(!has);

            const byId = await collection.findByIds(['constructor']).exec();
            assert.ok(!byId.has('constructor'));

            db.close();
        });
    });
});
