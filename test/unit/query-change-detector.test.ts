import assert from 'assert';
import clone from 'clone';
import config from './config';

import * as humansCollection from './../helper/humans-collection';
import * as schemaObjects from '../helper/schema-objects';
import * as util from '../../dist/lib/util';
import AsyncTestUtil from 'async-test-util';
import RxDB from '../../';
import {
    QueryChangeDetector,
    create as createQueryChangeDetector,
    _isDocInResultData,
    _isSortedBefore,
    enableDebugging,
    _sortFieldChanged
} from '../../dist/lib/query-change-detector';

import {
    first,
    filter,
    map
} from 'rxjs/operators';

let SpawnServer: any;
if (config.platform.isNode()) {
    SpawnServer = require('../helper/spawn-server');
    RxDB.plugin(require('pouchdb-adapter-http'));
}

// uncomment to debug
// import * as QueryChangeDetector from '../../dist/lib/query-change-detector';
// enableDebugging();


config.parallel('query-change-detector.test.js', () => {
    describe('._isDocInResultData()', async () => {
        it('should return true', async () => {
            const col = await humansCollection.create(5);
            const q = col.find();
            await q.exec();
            const resData = q._resultsData;
            assert.strictEqual(q._resultsData.length, 5);
            const is = _isDocInResultData(q._queryChangeDetector, resData[0], resData);
            assert.strictEqual(is, true);
            col.database.destroy();
        });
        it('should return false', async () => {
            const col = await humansCollection.create(5);
            const q = col.find();
            await q.exec();
            const resData = q._resultsData;
            const anyDoc = clone(resData[0]);
            anyDoc._id = 'foobar';
            assert.strictEqual(q._resultsData.length, 5);
            const is = _isDocInResultData(q._queryChangeDetector, anyDoc, resData);
            assert.strictEqual(is, false);
            col.database.destroy();
        });
    });
    describe('_isSortedBefore()', () => {
        it('should return true', async () => {
            const col = await humansCollection.createPrimary(0);
            const q = col.find().sort('age');
            const docData1 = schemaObjects.human();
            docData1.age = 5;
            const docData2 = schemaObjects.human();
            docData2.age = 10;
            const res = _isSortedBefore(q._queryChangeDetector, docData1, docData2);
            assert.strictEqual(res, true);
            col.database.destroy();
        });
        it('should return false', async () => {
            const col = await humansCollection.createPrimary(0);
            const q = col.find().sort('age');
            const docData1 = schemaObjects.human();
            docData1.passportId = '000';
            docData1.age = 10;
            const docData2 = schemaObjects.human();
            docData2.passportId = '111';
            docData2.age = 5;
            const res = _isSortedBefore(q._queryChangeDetector, docData1, docData2);
            assert.strictEqual(res, false);
            col.database.destroy();
        });
        it('should return true (sort by _id when equal)', async () => {
            const col = await humansCollection.createPrimary(0);
            const q = col.find().sort('age');
            const docData1 = schemaObjects.human();
            docData1.passportId = '000';
            docData1.age = 5;
            const docData2 = schemaObjects.human();
            docData2.passportId = '111';
            docData2.age = 5;
            const res = _isSortedBefore(
                q._queryChangeDetector,
                docData1, docData2
            );
            assert.strictEqual(res, true);
            col.database.destroy();
        });
    });
    describe('._sortFieldChanged()', () => {
        it('should return true', async () => {
            const col = await humansCollection.createAgeIndex(0);

            const q = col.find().sort('age');
            const docDataBefore = schemaObjects.human();
            docDataBefore.age = 5;
            const docDataAfter = clone(docDataBefore);
            docDataAfter.age = 10;

            const changed = _sortFieldChanged(
                q._queryChangeDetector,
                docDataBefore,
                docDataAfter
            );
            assert.strictEqual(changed, true);
            col.database.destroy();
        });
        it('should return false', async () => {
            const col = await humansCollection.createAgeIndex(0);

            const q = col.find().sort('age');
            const docDataBefore = schemaObjects.human();
            const docDataAfter = clone(docDataBefore);

            const changed = _sortFieldChanged(
                q._queryChangeDetector,
                docDataBefore,
                docDataAfter
            );
            assert.strictEqual(changed, false);
            col.database.destroy();
        });
    });
    describe('.handleSingleChange()', () => {
        describe('R1 (removed and never matched)', () => {
            it('should jump in and return false', async () => {
                const col = await humansCollection.createPrimary(0);
                const q = col.find().where('firstName').ne('Alice');
                const changeEvents: any[] = [];
                const docData = schemaObjects.simpleHuman();
                docData.passportId = 'foobar';
                docData.firstName = 'Alice';
                await col.insert(docData);

                col.$
                    .pipe(
                        first()
                    )
                    .toPromise()
                    .then(cE => changeEvents.push(cE));

                await col.findOne('foobar').remove();
                await AsyncTestUtil.waitUntil(() => changeEvents.length === 1);
                const res = q._queryChangeDetector.handleSingleChange([], changeEvents[0]);
                assert.strictEqual(res, false);
                col.database.destroy();
            });
        });
    });
    describe('runChangeDetection()', () => {
        describe('no change', () => {
            it('should detect that change is not relevant for result', async () => {
                const col = await humansCollection.create(5);
                const q = col.find().where('name').eq('foobar');
                const res = await q.exec();
                assert.strictEqual(q._execOverDatabaseCount, 1);
                assert.strictEqual(res.length, 0);

                await col.insert(schemaObjects.human());

                await q.exec();
                assert.strictEqual(q._execOverDatabaseCount, 1);

                col.database.destroy();
            });
        });

        /**
         * each optimisation-shortcut has a key, this tests each of them
         */
        describe('all constellations', () => {
            describe('R1', () => {
                it('R1: doc which did not match, was removed', async () => {
                    const col = await humansCollection.create(1);
                    const q = col.find().where('name').eq('foobar');
                    let results = await q.exec();
                    assert.strictEqual(results.length, 0);
                    assert.strictEqual(q._execOverDatabaseCount, 1);

                    await col.findOne().remove();

                    results = await q.exec();
                    assert.strictEqual(results.length, 0);
                    assert.strictEqual(q._execOverDatabaseCount, 1);

                    col.database.destroy();
                });
            });
            describe('R2', () => {
                it('R2: doc which was before first result was removed', async () => {
                    const col = await humansCollection.create(5);
                    const q = col.find().skip(1).limit(10);
                    let results = await q.exec();
                    assert.strictEqual(results.length, 4);
                    assert.strictEqual(q._execOverDatabaseCount, 1);

                    // removed skipped one
                    await col.find().sort('passportId').limit(1).remove();

                    results = await q.exec();
                    assert.strictEqual(results.length, 3);
                    assert.strictEqual(q._execOverDatabaseCount, 1);

                    col.database.destroy();
                });
            });
            describe('R3', () => {
                it('R3: doc which was in results got removed', async () => {
                    const col = await humansCollection.create(5);
                    const q = col.find().limit(10);
                    let results = await q.exec();
                    assert.strictEqual(results.length, 5);
                    assert.strictEqual(q._execOverDatabaseCount, 1);

                    await col.findOne().skip(1).remove();

                    results = await q.exec();
                    assert.strictEqual(results.length, 4);
                    assert.strictEqual(q._execOverDatabaseCount, 1);

                    col.database.destroy();
                });
                it('BUG: R3: does not work when no limit and no skip', async () => {
                    const col = await humansCollection.create(5);
                    const q = col.find();
                    let results = await q.exec();
                    assert.strictEqual(results.length, 5);
                    assert.strictEqual(q._execOverDatabaseCount, 1);

                    await col.findOne().skip(1).remove();

                    results = await q.exec();
                    assert.strictEqual(results.length, 4);
                    assert.strictEqual(q._execOverDatabaseCount, 1);
                    col.database.destroy();
                });
            });
            describe('R4', () => {
                it('R4: sorted after and got removed', async () => {
                    const col = await humansCollection.create(5);

                    const q = col.find().limit(4);
                    let results = await q.exec();
                    assert.strictEqual(results.length, 4);
                    assert.strictEqual(q._execOverDatabaseCount, 1);

                    const last: any = await col.findOne().skip(4).exec();
                    assert.ok(!results.map(doc => doc.passportId).includes(last.passportId));

                    await last.remove();

                    results = await q.exec();
                    assert.strictEqual(results.length, 4);
                    assert.strictEqual(q._execOverDatabaseCount, 1);

                    col.database.destroy();
                });
            });
            describe('U1', () => {
                it('U1: not matched and not matches now', async () => {
                    const col = await humansCollection.create(4);

                    const other = schemaObjects.human();
                    other.passportId = 'foobar';
                    const otherDoc = await col.insert(other);

                    const q = col.find().where('passportId').ne('foobar');
                    let results = await q.exec();
                    assert.strictEqual(results.length, 4);
                    assert.strictEqual(q._execOverDatabaseCount, 1);

                    await otherDoc.atomicSet('firstName', 'piotr');

                    results = await q.exec();
                    assert.strictEqual(results.length, 4);
                    assert.strictEqual(q._execOverDatabaseCount, 1);

                    col.database.destroy();
                });
            });
            describe('U2', () => {
                it('U2: still matching', async () => {
                    const col = await humansCollection.createAgeIndex(5);
                    const q = col.find().sort('age');
                    let results = await q.exec();
                    assert.strictEqual(results.length, 5);
                    assert.strictEqual(q._execOverDatabaseCount, 1);

                    const oneDoc = await col.findOne().skip(2).exec();
                    await oneDoc.atomicSet('age', 1);

                    results = await q.exec();
                    assert.strictEqual(results.length, 5);
                    assert.strictEqual(q._execOverDatabaseCount, 1);
                    assert.strictEqual(results[0].age, 1);
                    col.database.destroy();
                });
            });
            describe('U3', () => {
                it('U3: not matched, but matches now, no.skip, limit < length', async () => {
                    const col = await humansCollection.createAgeIndex(5);
                    const q = col.find().sort('passportId');
                    let results = await q.exec();
                    assert.strictEqual(results.length, 5);
                    assert.strictEqual(q._execOverDatabaseCount, 1);

                    const other = schemaObjects.human();
                    other.passportId = '000aaaaa'; // to make sure it sorts at start
                    await col.insert(other);

                    results = await q.exec();
                    assert.strictEqual(results.length, 6);
                    assert.strictEqual(q._execOverDatabaseCount, 1);
                    assert.strictEqual(results[0].passportId, '000aaaaa');
                    col.database.destroy();
                });
                it('U3: BUG: does not resort when sorted by primary', async () => {
                    const col = await humansCollection.createPrimary(5);
                    const q = col.find().sort('passportId');
                    let results = await q.exec();
                    assert.strictEqual(results.length, 5);
                    assert.strictEqual(q._execOverDatabaseCount, 1);

                    const firstDoc = schemaObjects.simpleHuman();
                    firstDoc.passportId = '000aaa'; // to make sure it sorts at start
                    await col.insert(firstDoc);

                    const last = schemaObjects.simpleHuman();
                    last.passportId = 'zzzzzz'; // to make sure it sorts at last
                    await col.insert(last);

                    const referenceResults = await col.find().where('passportId').ne('foobar').exec();
                    assert.strictEqual(referenceResults.length, 7);

                    results = await q.exec();

                    assert.strictEqual(results.length, 7);
                    assert.strictEqual(q._execOverDatabaseCount, 1);
                    assert.strictEqual(results[0].passportId, '000aaa');
                    assert.strictEqual(results[6].passportId, 'zzzzzz');
                    col.database.destroy();
                });
            });
        });
    });
    describe('integration', () => {
        describe('sort-order', () => {
            it('should order by primary by default', async () => {
                const schema = {
                    version: 0,
                    type: 'object',
                    keyCompression: false,
                    properties: {
                        id: {
                            type: 'string',
                            primary: true
                        },
                        passportId: {
                            type: 'string',
                            index: true
                        }
                    }
                };
                const col = await humansCollection.createBySchema(schema);

                // insert 3 docs
                await col.insert({
                    id: 'ccc',
                    passportId: 'foobar1'
                });
                await col.insert({
                    id: 'bbb',
                    passportId: 'foobar2'
                });
                await col.insert({
                    id: 'ddd',
                    passportId: 'foobar3'
                });
                await col.insert({
                    id: 'aaa',
                    passportId: 'foobar4'
                });

                // it should sort by primary even if other index is used
                const docs = await col
                    .find()
                    .where('passportId')
                    .ne('foobar3')
                    .exec();

                assert.deepStrictEqual(
                    docs.map((d: any) => d['id']), [
                    'aaa',
                    'bbb',
                    'ccc'
                ]
                );

                // it should find the same order with pouchdb
                const pouchResult = await col.pouch.find(
                    col
                        .find()
                        .where('passportId')
                        .ne('foobar3').toJSON()
                );
                assert.deepStrictEqual(
                    docs.map((d: any) => d['id']),
                    pouchResult.docs.map(doc => doc._id)
                );


                // same should apply when change-detection runs
                const docs$ = await col
                    .find()
                    .where('passportId')
                    .ne('foobar3')
                    .$;

                const results: any[] = [];
                const sub = docs$
                    .pipe(
                        filter(ds => ds !== null),
                        map(ds => ds.map((doc: any) => doc['id']))
                    ).subscribe(docsIds => results.push(docsIds));

                await AsyncTestUtil.waitUntil(() => results.length === 1);

                await col.insert({
                    id: 'aab',
                    passportId: 'foobar5'
                });

                await AsyncTestUtil.waitUntil(() => results.length === 2);

                const lastResult = results[1];

                assert.deepStrictEqual(
                    lastResult, [
                    'aaa',
                    'aab',
                    'bbb',
                    'ccc'
                ]
                );

                // it should find the same order with pouchdb
                const pouchResult2 = await col.pouch.find(
                    col
                        .find()
                        .where('passportId')
                        .ne('foobar3').toJSON()
                );
                assert.deepStrictEqual(
                    lastResult,
                    pouchResult2.docs.map(doc => doc._id)
                );

                sub.unsubscribe();
                col.database.destroy();
            });
        });
    });
    describe('ISSUES', () => {
        it('SYNC and Observe does not work with R3 - resort', async () => {
            if (!config.platform.isNode()) return;
            const server = await SpawnServer.spawn();
            const col = await humansCollection.createPrimary(5);
            col.sync({
                remote: server.url,
                options: {
                    live: true
                }
            });

            const results: any[] = [];
            const q = col.find().sort('passportId');
            const sub = q.$.subscribe(res => results.push(res));
            await AsyncTestUtil.waitUntil(() => results.length === 1);
            assert.strictEqual(results[0].length, 5);
            assert.strictEqual(q._execOverDatabaseCount, 1);


            const firstDoc = schemaObjects.simpleHuman();
            firstDoc.passportId = '000aaa'; // to make sure it sorts at start
            await col.insert(firstDoc);

            await AsyncTestUtil.waitUntil(() => results.length === 2);
            await util.promiseWait(100);

            // here is the error -> this must be 6
            assert.strictEqual(col._changeEventBuffer.counter, 6);

            const last = schemaObjects.simpleHuman();
            last.passportId = 'zzzzzz'; // to make sure it sorts at last
            await col.insert(last);

            await AsyncTestUtil.waitUntil(() => results.length === 3);

            assert.strictEqual(results[2].length, 7);
            assert.strictEqual(q._execOverDatabaseCount, 1);
            assert.strictEqual(results[2][0].passportId, '000aaa');
            assert.strictEqual(results[2][6].passportId, 'zzzzzz');

            sub.unsubscribe();
            server.close();
            col.database.destroy();
        });
    });
    it('BUG: no optimisation for irrelevant insert', async () => {
        const schema = {
            title: 'messages schema',
            description: 'describes a message',
            version: 0,
            keyCompression: false,
            type: 'object',
            properties: {
                id: {
                    type: 'string',
                    primary: true
                },
                text: {
                    type: 'string'
                },
                time: {
                    type: 'number',
                    index: true
                },
                read: {
                    description: 'true if was read by the reciever',
                    type: 'boolean'
                },
                sender: {
                    type: 'string',
                    ref: 'users'
                },
                reciever: {
                    type: 'string',
                    ref: 'users'
                }
            },
            compoundIndexes: [
                ['sender', 'time'],
                ['reciever', 'time']
            ],
            required: [
                'text',
                'time',
                'read',
                'sender',
                'reciever'
            ]
        };
        const col = await humansCollection.createBySchema(schema);
        const user1 = '1';
        const user2 = '2';
        const getQuery = () => col.findOne({
            $or: [
                {
                    sender: {
                        $eq: user1
                    },
                    reciever: {
                        $eq: user2
                    }
                },
                {
                    sender: {
                        $eq: user2
                    },
                    reciever: {
                        $eq: user1
                    }
                }
            ]
        }).sort('-time');

        await getQuery().exec();
        const countBefore = getQuery()._execOverDatabaseCount;

        // insert something that does not match
        await col.insert({
            id: AsyncTestUtil.randomString(10),
            text: AsyncTestUtil.randomString(10),
            time: AsyncTestUtil.randomNumber(1, 1000),
            read: false,
            sender: '3',
            reciever: '4'
        });

        await getQuery().exec();
        const countAfter = getQuery()._execOverDatabaseCount;
        assert.strictEqual(countBefore, countAfter);
        col.database.destroy();
    });
});
