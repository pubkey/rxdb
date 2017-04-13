import assert from 'assert';
import {
    default as clone
} from 'clone';

import * as humansCollection from './../helper/humans-collection';
import * as schemaObjects from '../helper/schema-objects';
import * as util from '../../dist/lib/util';
import * as RxDocument from '../../dist/lib/RxDocument';

process.on('unhandledRejection', function(err) {
    throw err;
});

describe('QueryChangeDetector.test.js', () => {
    describe('.doesDocMatchQuery()', () => {
        it('should match', async() => {
            const col = await humansCollection.create(0);
            const q = col.find().where('firstName').ne('foobar');
            const docData = schemaObjects.human();
            assert.ok(q._queryChangeDetector.doesDocMatchQuery(docData));
            col.database.destroy();
        });
        it('should not match', async() => {
            const col = await humansCollection.create(0);
            const q = col.find().where('firstName').ne('foobar');
            const docData = schemaObjects.human();
            docData.firstName = 'foobar';
            assert.equal(false, q._queryChangeDetector.doesDocMatchQuery(docData));
            col.database.destroy();
        });
        it('should match ($gt)', async() => {
            const col = await humansCollection.create(0);
            const q = col.find().where('age').gt(1);
            const docData = schemaObjects.human();
            docData.age = 5;
            assert.ok(q._queryChangeDetector.doesDocMatchQuery(docData));
            col.database.destroy();
        });
        it('should not match ($gt)', async() => {
            const col = await humansCollection.create(0);
            const q = col.find().where('age').gt(100);
            const docData = schemaObjects.human();
            docData.age = 5;
            assert.equal(false, q._queryChangeDetector.doesDocMatchQuery(docData));
            col.database.destroy();
        });
    });
    describe('.isDocInResultData()', async() => {
        it('should return true', async() => {
            const col = await humansCollection.create(5);
            const q = col.find();
            await q.exec();
            const resData = q._resultsData;
            assert.equal(q._resultsData.length, 5);
            const is = q._queryChangeDetector.isDocInResultData(resData[0], resData);
            assert.equal(is, true);
            col.database.destroy();
        });
        it('should return false', async() => {
            const col = await humansCollection.create(5);
            const q = col.find();
            await q.exec();
            const resData = q._resultsData;
            const anyDoc = clone(resData[0]);
            anyDoc._id = 'foobar';
            assert.equal(q._resultsData.length, 5);
            const is = q._queryChangeDetector.isDocInResultData(anyDoc, resData);
            assert.equal(is, false);
            col.database.destroy();
        });
    });

    describe('._isSortedBefore()', () => {
        it('should return true', async() => {
            const col = await humansCollection.createPrimary(0);
            const q = col.find().sort('age');
            const docData1 = schemaObjects.human();
            docData1.age = 5;
            const docData2 = schemaObjects.human();
            docData2.age = 10;
            const res = q._queryChangeDetector._isSortedBefore(docData1, docData2);
            assert.equal(res, true);
            col.database.destroy();
        });
        it('should return false', async() => {
            const col = await humansCollection.createPrimary(0);
            const q = col.find().sort('age');
            const docData1 = schemaObjects.human();
            docData1.passportId = '000';
            docData1.age = 10;
            const docData2 = schemaObjects.human();
            docData2.passportId = '111';
            docData2.age = 5;
            const res = q._queryChangeDetector._isSortedBefore(docData1, docData2);
            assert.equal(res, false);
            col.database.destroy();
        });
        it('should return true (sort by _id when equal)', async() => {
            const col = await humansCollection.createPrimary(0);
            const q = col.find().sort('age');
            const docData1 = schemaObjects.human();
            docData1.passportId = '000';
            docData1.age = 5;
            const docData2 = schemaObjects.human();
            docData2.passportId = '111';
            docData2.age = 5;
            const res = q._queryChangeDetector._isSortedBefore(docData1, docData2);
            assert.equal(res, true);
            col.database.destroy();
        });

    });

    describe('runChangeDetection()', () => {
        describe('mustReExec', () => {
            // TODO
        });
        describe('no change', () => {
            it('should detect that change is not relevant for result', async() => {
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
         * each optimisation-shortcut has a number, this tests each of them
         */
        describe('all constelations', () => {

        });

    });

    describe('e', () => {
        //  it('e', () => process.exit());
    });
});
