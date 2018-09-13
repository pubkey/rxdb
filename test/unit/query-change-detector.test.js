import assert from 'assert';
import clone from 'clone';
import config from './config';

import * as humansCollection from './../helper/humans-collection';
import * as schemaObjects from '../helper/schema-objects';
import * as util from '../../dist/lib/util';
import AsyncTestUtil from 'async-test-util';
import RxDB from '../../dist/lib/index';
import * as QueryChangeDetector from '../../dist/lib/query-change-detector';

import {
    first,
    filter,
    map
} from 'rxjs/operators';

let SpawnServer;
if (config.platform.isNode()) {
    SpawnServer = require('../helper/spawn-server');
    RxDB.PouchDB.plugin(require('pouchdb-adapter-http'));
}

// uncomment to debug
// import * as QueryChangeDetector from '../../dist/lib/query-change-detector';
// QueryChangeDetector.enableDebugging();


config.parallel('query-change-detector.test.js', () => {
    describe('doesDocMatchQuery()', () => {
        it('should match', async () => {
            const col = await humansCollection.create(0);
            const q = col.find().where('firstName').ne('foobar');
            const docData = schemaObjects.human();
            assert.ok(QueryChangeDetector.doesDocMatchQuery(q._queryChangeDetector, docData));
            col.database.destroy();
        });
        it('should not match', async () => {
            const col = await humansCollection.create(0);
            const q = col.find().where('firstName').ne('foobar');
            const docData = schemaObjects.human();
            docData.firstName = 'foobar';
            assert.equal(false, QueryChangeDetector.doesDocMatchQuery(q._queryChangeDetector, docData));
            col.database.destroy();
        });
        it('should match ($gt)', async () => {
            const col = await humansCollection.create(0);
            const q = col.find().where('age').gt(1);
            const docData = schemaObjects.human();
            docData.age = 5;
            assert.ok(QueryChangeDetector.doesDocMatchQuery(q._queryChangeDetector, docData));
            col.database.destroy();
        });
        it('should not match ($gt)', async () => {
            const col = await humansCollection.create(0);
            const q = col.find().where('age').gt(100);
            const docData = schemaObjects.human();
            docData.age = 5;
            assert.equal(false, QueryChangeDetector.doesDocMatchQuery(q._queryChangeDetector, docData));
            col.database.destroy();
        });
        it('BUG: this should match', async () => {
            const col = await humansCollection.create(0);
            const q = col.find();

            const docData = {
                color: 'green',
                hp: 100,
                maxHP: 767,
                name: 'asdfsadf',
                _rev: '1-971bfd0b8749eb33b6aae7f6c0dc2cd4'
            };

            assert.equal(true, QueryChangeDetector.doesDocMatchQuery(q._queryChangeDetector, docData));
            col.database.destroy();
        });
    });
    describe('._isDocInResultData()', async () => {
        it('should return true', async () => {
            const col = await humansCollection.create(5);
            const q = col.find();
            await q.exec();
            const resData = q._resultsData;
            assert.equal(q._resultsData.length, 5);
            const is = QueryChangeDetector._isDocInResultData(q._queryChangeDetector, resData[0], resData);
            assert.equal(is, true);
            col.database.destroy();
        });
        it('should return false', async () => {
            const col = await humansCollection.create(5);
            const q = col.find();
            await q.exec();
            const resData = q._resultsData;
            const anyDoc = clone(resData[0]);
            anyDoc._id = 'foobar';
            assert.equal(q._resultsData.length, 5);
            const is = QueryChangeDetector._isDocInResultData(q._queryChangeDetector, anyDoc, resData);
            assert.equal(is, false);
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
            const res = QueryChangeDetector._isSortedBefore(q._queryChangeDetector, docData1, docData2);
            assert.equal(res, true);
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
            const res = QueryChangeDetector._isSortedBefore(q._queryChangeDetector, docData1, docData2);
            assert.equal(res, false);
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
            const res = QueryChangeDetector._isSortedBefore(q._queryChangeDetector, docData1, docData2);
            assert.equal(res, true);
            col.database.destroy();
        });
    });
    describe('._resortDocData()', () => {
        it('should return resorted doc-data', async () => {
            const col = await humansCollection.createAgeIndex(3);
            const q = col.find().sort('age');
            const docData1 = schemaObjects.human();
            docData1.age = 5;
            docData1._id = 'aaaaaaaa';
            const docData2 = schemaObjects.human();
            docData2.age = 10;
            docData2._id = 'bbbbbbb';

            const res = QueryChangeDetector._resortDocData(q._queryChangeDetector, [docData2, docData1]);
            assert.equal(res[0].age, 5);
            assert.equal(res[1].age, 10);

            const res2 = QueryChangeDetector._resortDocData(q._queryChangeDetector, [docData1, docData2]);
            assert.equal(res2[0].age, 5);
            assert.equal(res2[1].age, 10);

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

            const changed = QueryChangeDetector._sortFieldChanged(q._queryChangeDetector, docDataBefore, docDataAfter);
            assert.equal(changed, true);
            col.database.destroy();
        });
        it('should return false', async () => {
            const col = await humansCollection.createAgeIndex(0);

            const q = col.find().sort('age');
            const docDataBefore = schemaObjects.human();
            const docDataAfter = clone(docDataBefore);

            const changed = QueryChangeDetector._sortFieldChanged(q._queryChangeDetector, docDataBefore, docDataAfter);
            assert.equal(changed, false);
            col.database.destroy();
        });
    });
    describe('.handleSingleChange()', () => {
        describe('R1 (removed and never matched)', () => {
            it('should jump in and return false', async () => {
                const col = await humansCollection.createPrimary(0);
                const q = col.find().where('firstName').ne('Alice');
                const changeEvents = [];
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
                assert.equal(res, false);
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
                assert.equal(q._execOverDatabaseCount, 1);
                assert.equal(res.length, 0);

                await col.insert(schemaObjects.human());

                await q.exec();
                assert.equal(q._execOverDatabaseCount, 1);

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
                    assert.equal(results.length, 0);
                    assert.equal(q._execOverDatabaseCount, 1);

                    await col.findOne().remove();

                    results = await q.exec();
                    assert.equal(results.length, 0);
                    assert.equal(q._execOverDatabaseCount, 1);

                    col.database.destroy();
                });
            });
            describe('R2', () => {
                it('R2: doc which was before first result was removed', async () => {
                    const col = await humansCollection.create(5);
                    const q = col.find().skip(1).limit(10);
                    let results = await q.exec();
                    assert.equal(results.length, 4);
                    assert.equal(q._execOverDatabaseCount, 1);

                    // removed skipped one
                    await col.find().sort('passportId').limit(1).remove();

                    results = await q.exec();
                    assert.equal(results.length, 3);
                    assert.equal(q._execOverDatabaseCount, 1);

                    col.database.destroy();
                });
            });
            describe('R3', () => {
                it('R3: doc which was in results got removed', async () => {
                    const col = await humansCollection.create(5);
                    const q = col.find().limit(10);
                    let results = await q.exec();
                    assert.equal(results.length, 5);
                    assert.equal(q._execOverDatabaseCount, 1);

                    await col.findOne().skip(1).remove();

                    results = await q.exec();
                    assert.equal(results.length, 4);
                    assert.equal(q._execOverDatabaseCount, 1);

                    col.database.destroy();
                });
                it('BUG: R3: does not work when no limit and no skip', async () => {
                    const col = await humansCollection.create(5);
                    const q = col.find();
                    let results = await q.exec();
                    assert.equal(results.length, 5);
                    assert.equal(q._execOverDatabaseCount, 1);

                    await col.findOne().skip(1).remove();

                    results = await q.exec();
                    assert.equal(results.length, 4);
                    assert.equal(q._execOverDatabaseCount, 1);
                    col.database.destroy();
                });
            });
            describe('R4', () => {
                it('R4: sorted after and got removed', async () => {
                    const col = await humansCollection.create(5);

                    const q = col.find().limit(4);
                    let results = await q.exec();
                    assert.equal(results.length, 4);
                    assert.equal(q._execOverDatabaseCount, 1);

                    const last = await col.findOne().skip(4).exec();
                    assert.ok(!results.map(doc => doc.passportId).includes(last.passportId));

                    await last.remove();

                    results = await q.exec();
                    assert.equal(results.length, 4);
                    assert.equal(q._execOverDatabaseCount, 1);

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
                    assert.equal(results.length, 4);
                    assert.equal(q._execOverDatabaseCount, 1);

                    await otherDoc.atomicSet('firstName', 'piotr');

                    results = await q.exec();
                    assert.equal(results.length, 4);
                    assert.equal(q._execOverDatabaseCount, 1);

                    col.database.destroy();
                });
            });
            describe('U2', () => {
                it('U2: still matching', async () => {
                    const col = await humansCollection.createAgeIndex(5);
                    const q = col.find().sort('age');
                    let results = await q.exec();
                    assert.equal(results.length, 5);
                    assert.equal(q._execOverDatabaseCount, 1);

                    const oneDoc = await col.findOne().skip(2).exec();
                    await oneDoc.atomicSet('age', 1);

                    results = await q.exec();
                    assert.equal(results.length, 5);
                    assert.equal(q._execOverDatabaseCount, 1);
                    assert.equal(results[0].age, 1);
                    col.database.destroy();
                });
            });
            describe('U3', () => {
                it('U3: not matched, but matches now, no.skip, limit < length', async () => {
                    const col = await humansCollection.createAgeIndex(5);
                    const q = col.find().sort('passportId');
                    let results = await q.exec();
                    assert.equal(results.length, 5);
                    assert.equal(q._execOverDatabaseCount, 1);

                    const other = schemaObjects.human();
                    other.passportId = '000aaaaa'; // to make sure it sorts at start
                    await col.insert(other);

                    results = await q.exec();
                    assert.equal(results.length, 6);
                    assert.equal(q._execOverDatabaseCount, 1);
                    assert.equal(results[0].passportId, '000aaaaa');
                    col.database.destroy();
                });
                it('U3: BUG: does not resort when sorted by primary', async () => {
                    const col = await humansCollection.createPrimary(5);
                    const q = col.find().sort('passportId');
                    let results = await q.exec();
                    assert.equal(results.length, 5);
                    assert.equal(q._execOverDatabaseCount, 1);

                    const first = schemaObjects.simpleHuman();
                    first.passportId = '000aaa'; // to make sure it sorts at start
                    await col.insert(first);

                    const last = schemaObjects.simpleHuman();
                    last.passportId = 'zzzzzz'; // to make sure it sorts at last
                    await col.insert(last);

                    const referenceResults = await col.find().where('passportId').ne('foobar').exec();
                    assert.equal(referenceResults.length, 7);

                    results = await q.exec();
                    assert.equal(results.length, 7);
                    assert.equal(q._execOverDatabaseCount, 1);
                    assert.equal(results[0].passportId, '000aaa');
                    assert.equal(results[6].passportId, 'zzzzzz');
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

                assert.deepEqual(
                    docs.map(d => d.id), [
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
                assert.deepEqual(
                    docs.map(d => d.id),
                    pouchResult.docs.map(doc => doc._id)
                );


                // same should apply when change-detection runs
                const docs$ = await col
                    .find()
                    .where('passportId')
                    .ne('foobar3')
                    .$;

                const results = [];
                const sub = docs$
                    .pipe(
                        filter(docs => docs !== null),
                        map(docs => docs.map(doc => doc.id))
                    ).subscribe(docsIds => results.push(docsIds));

                await AsyncTestUtil.waitUntil(() => results.length === 1);

                await col.insert({
                    id: 'aab',
                    passportId: 'foobar5'
                });

                await AsyncTestUtil.waitUntil(() => results.length === 2);

                const lastResult = results[1];

                assert.deepEqual(
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
                assert.deepEqual(
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

            const results = [];
            const q = col.find().sort('passportId');
            const sub = q.$.subscribe(res => results.push(res));
            await AsyncTestUtil.waitUntil(() => results.length === 1);
            assert.equal(results[0].length, 5);
            assert.equal(q._execOverDatabaseCount, 1);


            const first = schemaObjects.simpleHuman();
            first.passportId = '000aaa'; // to make sure it sorts at start
            await col.insert(first);

            await AsyncTestUtil.waitUntil(() => results.length === 2);
            await util.promiseWait(100);

            // here is the error -> this must be 6
            assert.equal(col._changeEventBuffer.counter, 6);

            const last = schemaObjects.simpleHuman();
            last.passportId = 'zzzzzz'; // to make sure it sorts at last
            await col.insert(last);

            await AsyncTestUtil.waitUntil(() => results.length === 3);

            assert.equal(results[2].length, 7);
            assert.equal(q._execOverDatabaseCount, 1);
            assert.equal(results[2][0].passportId, '000aaa');
            assert.equal(results[2][6].passportId, 'zzzzzz');

            sub.unsubscribe();
            server.close();
            col.database.destroy();
        });
    });
    describe('e', () => {
        //    it('e', () => process.exit());
    });
});
