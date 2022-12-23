import assert from 'assert';
import AsyncTestUtil from 'async-test-util';
import config from './config';
import clone from 'clone';

import * as humansCollection from './../helper/humans-collection';
import * as schemaObjects from '../helper/schema-objects';
import * as schemas from './../helper/schemas';

import {
    isRxQuery,
    createRxDatabase,
    RxJsonSchema,
    promiseWait,
    randomCouchString,
    ensureNotFalsy,
} from '../../';

import { firstValueFrom } from 'rxjs';

describe('rx-query.test.ts', () => {
    config.parallel('.constructor', () => {
        it('should throw dev-mode error on wrong query object', async () => {
            const col = await humansCollection.create(0);

            await AsyncTestUtil.assertThrows(
                () => col.find({ foo: 'bar' } as any),
                'RxTypeError',
                'no valid query params'
            );

            col.database.destroy();
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
            col.database.destroy();
        });
        it('should NOT throw error when custom index is in schema indexes', async () => {
            const col = await humansCollection.createAgeIndex(0);
            col.find({
                selector: {},
                index: ['age']
            }).getPreparedQuery();
            col.database.destroy();
        });
    });
    config.parallel('.toJSON()', () => {
        it('should produce the correct selector-object', async () => {
            const col = await humansCollection.create(0);
            const q = col.find()
                .where('name').ne('Alice')
                .where('age').gt(18).lt(67)
                .limit(10)
                .sort('-age');
            const queryObj = q.mangoQuery;
            assert.deepStrictEqual(queryObj, {
                selector: {
                    name: {
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
            col.database.destroy();
        });
    });
    config.parallel('.toString()', () => {
        it('should get a valid string-representation', async () => {
            const col = await humansCollection.create(0);
            const q = col.find()
                .where('name').ne('Alice')
                .where('age').gt(18).lt(67)
                .limit(10)
                .sort('-age');
            const str = q.toString();
            const mustString = '{"op":"find","other":{"queryBuilderPath":"age"},"query":{"limit":10,"selector":{"age":{"$gt":18,"$lt":67},"name":{"$ne":"Alice"}},"sort":[{"age":"desc"}]}}';
            assert.strictEqual(str, mustString);
            const str2 = q.toString();
            assert.strictEqual(str2, mustString);

            col.database.destroy();
        });
        it('should get a valid string-representation with two sort params', async () => {
            const col = await humansCollection.createAgeIndex();
            const q = col.find().sort({
                passportId: 'desc', age: 'desc'
            });
            const str = q.toString();
            const mustString = '{"op":"find","other":{},"query":{"selector":{},"sort":[{"passportId":"desc"},{"age":"desc"}]}}';
            assert.strictEqual(str, mustString);
            const str2 = q.toString();
            assert.strictEqual(str2, mustString);

            col.database.destroy();
        });
        it('ISSUE #190: should contain the regex', async () => {
            if (!config.storage.hasRegexSupport) {
                return;
            }

            const col = await humansCollection.create(0);
            const queryWithoutRegex = col.find();
            const queryWithRegex = queryWithoutRegex.where('color').regex(new RegExp(/foobar/g));
            const queryString = queryWithRegex.toString();

            assert.ok(queryString.includes('foobar'));
            col.database.destroy();
        });
        it('same queries should return the same string', async () => {
            const col1 = await humansCollection.create(0);
            const col2 = await humansCollection.create(0);

            const query1 = col1.find()
                .where('age').gt(10)
                .where('name').ne('foobar')
                .sort('passportId').toString();

            const query2 = col2.find()
                .where('age').gt(10)
                .where('name').ne('foobar')
                .sort('passportId').toString();

            assert.strictEqual(query1, query2);
            col1.database.destroy();
            col2.database.destroy();
        });
        it('same queries should return the same string even if on same collection', async () => {
            const col = await humansCollection.create(0);

            const query1 = col.find()
                .where('age').gt(10)
                .where('name').ne('foobar')
                .sort('passportId').toString();

            const query2 = col.find()
                .where('age').gt(10)
                .where('name').ne('foobar')
                .sort('passportId').toString();

            assert.strictEqual(query1, query2);
            col.database.destroy();
        });
    });
    config.parallel('immutable', () => {
        it('should not be the same object (sort)', async () => {
            const col = await humansCollection.create(0);
            const q = col.find()
                .where('name').ne('Alice')
                .where('age').gt(18).lt(67)
                .limit(10)
                .sort('-age');
            const q2 = q.sort('name');
            assert.ok(isRxQuery(q2));
            assert.notStrictEqual(q, q2);
            col.database.destroy();
        });
        it('should not be the same object (where)', async () => {
            const col = await humansCollection.create(0);
            const q = col.find()
                .where('name').ne('Alice')
                .where('age').gt(18).lt(67)
                .limit(10)
                .sort('-age');
            const q2 = q.where('name').eq('foobar');
            assert.ok(isRxQuery(q2));
            assert.notStrictEqual(q, q2);
            assert.ok(q.id < q2.id);
            col.database.destroy();
        });
    });
    config.parallel('QueryCache.js', () => {
        it('return the same object', async () => {
            const col = await humansCollection.create(0);
            const q = col.find()
                .where('name').ne('Alice')
                .where('age').gt(18).lt(67)
                .limit(10)
                .sort('-age');
            const q2 = col.find()
                .where('name').ne('Alice')
                .where('age').gt(18).lt(67)
                .limit(10)
                .sort('-age');

            assert.deepStrictEqual(q, q2);
            assert.strictEqual(q.id, q2.id);
            col.database.destroy();
        });
        it('should return the same object after exec', async () => {
            const col = await humansCollection.createPrimary(0);
            const docData = schemaObjects.simpleHuman();
            await col.insert(docData);
            const query = col.findOne(docData.passportId);
            await query.exec();
            const query2 = col.findOne(docData.passportId);
            await query2.exec();
            assert.strictEqual(query.id, query2.id);
            col.database.destroy();
        });
        it('should have the correct amount of cached queries', async () => {
            const col = await humansCollection.create(0);
            const q3 = col.find()
                .where('name').ne('Bob');
            assert.ok(q3);
            const q = col.find()
                .where('name').ne('Alice');
            assert.ok(q);
            const q2 = col.find()
                .where('name').ne('Bob');
            assert.ok(q2);
            assert.strictEqual(col._queryCache._map.size, 4);
            col.database.destroy();
        });
        it('return another object', async () => {
            const col = await humansCollection.create(0);
            const q = col.find()
                .where('name').ne('Alice')
                .where('age').gt(18).lt(67)
                .limit(10)
                .sort('-age');
            const q2 = col.find()
                .where('name').ne('foobar')
                .where('age').gt(18).lt(67)
                .limit(10)
                .sort('-age');

            assert.notStrictEqual(q, q2);
            assert.notStrictEqual(q.id, q2.id);
            col.database.destroy();
        });
        it('ISSUE: ensure its the same query', async () => {
            const col = await humansCollection.create(0);

            const query1 = col.find()
                .where('age').gt(10)
                .where('name').ne('foobar')
                .sort('passportId');

            const query2 = col.find()
                .where('age').gt(10)
                .where('name').ne('foobar')
                .sort('passportId');

            assert.ok(query1 === query2);
            col.database.destroy();
        });

        it('should distinguish between different sort-orders', async () => {
            const col = await humansCollection.create(0);
            const q = col.find()
                .where('name').ne('Alice')
                .where('age').gt(18).lt(67)
                .limit(10)
                .sort('-age')
                .sort('name');
            const q2 = col.find()
                .where('name').ne('Alice')
                .where('age').gt(18).lt(67)
                .limit(10)
                .sort('name')
                .sort('-age');

            assert.notStrictEqual(q, q2);
            assert.notStrictEqual(q.id, q2.id);
            col.database.destroy();
        });
    });
    config.parallel('result caching', () => {
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

            col.database.destroy();
        });
    });
    config.parallel('.doesDocMatchQuery()', () => {
        it('should match', async () => {
            const col = await humansCollection.create(0);
            const q = col.find().where('firstName').ne('foobar');
            const docData = schemaObjects.human();
            assert.ok(q.doesDocumentDataMatch(docData));
            col.database.destroy();
        });
        it('should not match', async () => {
            const col = await humansCollection.create(0);
            const q = col.find().where('firstName').ne('foobar');
            const docData = schemaObjects.human();
            docData.firstName = 'foobar';
            assert.strictEqual(false, q.doesDocumentDataMatch(docData));
            col.database.destroy();
        });
        it('should match ($gt)', async () => {
            const col = await humansCollection.create(0);
            const q = col.find().where('age').gt(1);
            const docData = schemaObjects.human();
            docData.age = 5;
            assert.ok(q.doesDocumentDataMatch(docData));
            col.database.destroy();
        });
        it('should not match ($gt)', async () => {
            const col = await humansCollection.create(0);
            const q = col.find().where('age').gt(100);
            const docData = schemaObjects.human();
            docData.age = 5;
            assert.strictEqual(false, q.doesDocumentDataMatch(docData));
            col.database.destroy();
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
            col.database.destroy();
        });
    });
    config.parallel('.exec()', () => {
        it('should throw if top level field is not known to the schema', async () => {
            const col = await humansCollection.create(0);

            await AsyncTestUtil.assertThrows(
                () => col.find({
                    selector: {
                        asdfasdfasdf: 'asdf'
                    } as any
                }).exec(),
                'RxError',
                'QU13'
            );

            // should also detect wrong fields inside of $and
            await AsyncTestUtil.assertThrows(
                () => col.find({
                    selector: {
                        $and: [
                            {
                                asdfasdfasdf: 'asdf'
                            } as any,
                            {
                                asdfasdfasdf: 'asdf'
                            } as any
                        ]
                    }
                }).exec(),
                'RxError',
                'QU13'
            );

            col.database.destroy();
        });
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

            col.database.destroy();
        });
        it('should execOverDatabase when still subscribed and changeEvent comes in', async () => {
            const col = await humansCollection.create(2);

            // it is assumed that this query can never handled by event-reduce
            const query = col.find().sort('-passportId').limit(1);

            const fired: any[] = [];
            const sub1 = query.$.subscribe(res => {
                fired.push(res);
            });

            await AsyncTestUtil.waitUntil(() => fired.length === 1);

            assert.strictEqual(query._execOverDatabaseCount, 1);
            assert.strictEqual(query._latestChangeEvent, 2);

            const addObj = schemaObjects.human();
            addObj.passportId = 'zzzzzzzz';
            await col.insert(addObj);
            assert.strictEqual(query.collection._changeEventBuffer.counter, 3);

            await AsyncTestUtil.waitUntil(() => query._latestChangeEvent === 3);
            assert.strictEqual(query._latestChangeEvent, 3);

            await AsyncTestUtil.waitUntil(() => fired.length === 2);
            assert.strictEqual(fired[1].pop().passportId, addObj.passportId);
            sub1.unsubscribe();
            col.database.destroy();
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

            const addDoc = schemaObjects.human();

            // set _id to first value to force a re-exec-over database
            addDoc.passportId = '1-aaaaaaaaaaaaaaaaaaaaaaaaaaa';
            addDoc.firstName = 'NotAliceFoobar';

            await col.insert(addDoc);
            assert.strictEqual(q.collection._changeEventBuffer.counter, 3);

            assert.strictEqual(q._latestChangeEvent, 2);

            await promiseWait(1);
            results = await q.exec();
            assert.strictEqual(results.length, 2);
            assert.strictEqual(q._execOverDatabaseCount, 2);

            col.database.destroy();
        });
        it('querying fast should still return the same RxDocument', async () => {
            if (
                !config.platform.isNode()
            ) {
                return;
            }
            // use a 'slow' adapter because memory might be to fast
            const db = await createRxDatabase({
                name: config.rootPath + 'test_tmp/' + randomCouchString(10),
                storage: config.storage.getStorage(),
            });
            const cols = await db.addCollections({
                humans: {
                    schema: schemas.human
                }
            });
            const c = cols.humans;
            await c.insert(schemaObjects.human());

            const query1 = c.findOne().where('age').gt(0);
            const query2 = c.findOne().where('age').gt(1);
            const docs = await Promise.all([
                query1.exec(),
                query2.exec()
            ]);
            assert.ok(docs[0] === docs[1]);

            db.destroy();
        });
        it('querying after insert should always return the correct amount', async () => {
            const col = await humansCollection.create(0);

            const amount = 100;
            const query = col.find({
                selector: {
                    age: {
                        $gt: 1
                    }
                }
            });
            let inserted = 0;
            while (inserted < amount) {
                const docData = schemaObjects.human();
                docData.age = 10;
                await col.insert(docData);
                inserted = inserted + 1;
                const results = await query.exec();
                assert.strictEqual(results.length, inserted);
            }

            col.database.destroy();
        });
        it('should not make more requests then needed', async () => {
            const col = await humansCollection.createPrimary(0);
            const docData = schemaObjects.simpleHuman();
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

            col.database.destroy();
        });
        it('should not make more requests then needed on incremental upsert', async () => {
            const col = await humansCollection.createPrimary(0);
            const docData = schemaObjects.simpleHuman();
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
            col.database.destroy();
        });
        it('exec from other database-instance', async () => {
            if (!config.storage.hasPersistence) {
                return;
            }
            const dbName = randomCouchString(10);
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
                    .map(() => schemaObjects.averageSchema())
                    .map(data => col.insert(data))
            );

            await db.destroy();

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

            db2.destroy();
        });
        it('exec(true) should throw if missing', async () => {
            const c = await humansCollection.create(0);

            await AsyncTestUtil.assertThrows(
                () => c.findOne().exec(true),
                'RxError',
                'throwIfMissing'
            );

            c.database.destroy();
        });
        it('exec(true) should throw used with non-findOne', async () => {
            const c = await humansCollection.create(0);
            await AsyncTestUtil.assertThrows(
                () => c.find().exec(true),
                'RxError',
                'findOne'
            );
            c.database.destroy();
        });
        it('isFindOneByIdQuery(): .findOne(documentId) should use RxStorage().findDocumentsById() instead of RxStorage().query()', async () => {
            const c = await humansCollection.create();
            const docData = schemaObjects.human();
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
                }).exec()
            ];
            for (const operation of operations) {
                await operation();
            }

            assert.strictEqual(queryCalls, 0);
            c.database.destroy();
        });
    });
    config.parallel('update', () => {
        describe('positive', () => {
            it('updates a value on a query', async () => {
                const c = await humansCollection.create(2);
                const query = c.find();
                await query.update({
                    $set: {
                        firstName: 'new first name'
                    }
                });
                const docs = await query.exec();
                for (const doc of docs)
                    assert.strictEqual(doc._data.firstName, 'new first name');
                c.database.destroy();
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
                c.database.destroy();
            });
            it('dont crash when findOne with no result', async () => {
                const c = await humansCollection.create(2);
                const query = c.findOne().where('age').gt(1000000);
                await query.update({
                    $set: {
                        firstName: 'new first name'
                    }
                });
                const doc = await query.exec();
                assert.strictEqual(doc, null);
                c.database.destroy();
            });
        });
    });
    config.parallel('issues', () => {
        it('#278 queryCache breaks when pointer out of bounds', async () => {
            const c = await humansCollection.createPrimary(0);

            // insert some docs
            const insertAmount = 100;
            await c.bulkInsert(
                new Array(insertAmount)
                    .fill(0)
                    .map((_v, idx) => schemaObjects.human(undefined, idx))
            );

            // make and exec query
            const query = c.find();
            const docs = await query.exec();
            assert.strictEqual(docs.length, insertAmount);

            // produces changeEvents
            await c.bulkInsert(
                new Array(300) // higher than ChangeEventBuffer.limit
                    .fill(0)
                    .map(() => schemaObjects.human())
            );

            // re-exec query
            const docs2 = await query.exec();
            assert.strictEqual(docs2.length, 400);

            // try same with upserts
            const docData = new Array(200)
                .fill(0)
                .map(() => schemaObjects.human());
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

            c.database.destroy();
        });
        it('#585 sort by sub-path not working', async () => {
            if (['lokijs', 'remote'].includes(config.storage.name)) {
                // TODO fix wrong sort order in lokijs
                return;
            }
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
                                maxLength: 1000
                            },
                        },
                    }
                },
                indexes: ['info.title']
            };
            const db = await createRxDatabase({
                name: randomCouchString(10),
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

            db.destroy();
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
                indexes: ['created_at']
            };
            const collection = await humansCollection.createBySchema(mySchema);

            await collection.insert({
                id: randomCouchString(12),
                event_id: 1,
                user_id: '6',
                created_at: 1337
            });
            await collection.insert({
                id: randomCouchString(12),
                event_id: 2,
                user_id: '6',
                created_at: 1337
            });


            /* eslint-disable */
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
            /* eslint-enable */

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

            collection.database.destroy();
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

            c.database.destroy();

            // subscriptions
            const c2 = await humansCollection.create(2);
            const query2 = c2.find();
            const res1: any = await firstValueFrom(query2.$);
            res1.push({
                foo: 'bar'
            });
            const res2 = await firstValueFrom(query2.$);
            assert.strictEqual(res2.length, 2);

            c2.database.destroy();
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
            const name = randomCouchString(10);

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

            db.destroy();
        });
        /**
         * via gitter at 11 November 2019 10:10
         */
        it('gitter: query with regex does not return correct results', async () => {
            if (!config.storage.hasRegexSupport) {
                return;
            }

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
                name: randomCouchString(10),
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
            const regexp = new RegExp('^Doe$', 'i');
            const result1 = await collection.find({
                selector: {
                    lastName: { $regex: regexp }
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

            db.destroy();
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

            c.database.destroy();
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

            collection.database.destroy();
        });
        /**
        * via gitter @sfordjasiri 27.8.2020 10:27
        */
        it('gitter: mutating find-params causes different results', async () => {
            const db = await createRxDatabase({
                name: randomCouchString(10),
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

            const docDataMatching = schemaObjects.human();
            docDataMatching.age = 42;
            await c.insert(docDataMatching);

            const docDataNotMatching = schemaObjects.human();
            docDataNotMatching.age = 99;
            await c.insert(docDataNotMatching);

            const queryParams = {
                selector: {
                    age: 42
                }
            };
            const queryMatching = c.find(queryParams);
            const queryMatchingOne = c.findOne(queryParams);

            const res1 = await queryMatching.exec();
            const resOne1 = await queryMatchingOne.exec();
            assert.strictEqual(res1.length, 1);
            assert.ok(resOne1);
            assert.strictEqual(resOne1.age, 42);

            queryParams.selector.age = 0;

            // trigger a write so the results are not cached
            const addData = schemaObjects.human();
            addData.age = 55;
            await c.insert(addData);

            const res2 = await queryMatching.exec();
            const resOne2 = await queryMatchingOne.exec();

            assert.strictEqual(res2.length, 1);
            assert.ok(res2);
            assert.strictEqual(resOne2.age, 42);

            db.destroy();
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
                name: randomCouchString(10),
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

            db.destroy();
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

            c.database.destroy();
        });
    });
});
