import assert from 'assert';
import {
    default as clone
} from 'clone';

import * as humansCollection from './../helper/humans-collection';
import * as schemaObjects from '../helper/schema-objects';
import * as util from '../../dist/lib/util';

import * as QueryChangeDetector from '../../dist/lib/QueryChangeDetector';

// TODO disable later
QueryChangeDetector.enableDebugging();
QueryChangeDetector.enable();


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
        it('BUG: this should match', async() => {
            const col = await humansCollection.create(0);
            const q = col.find().sort('name');

            const docData = {
                color: 'green',
                hp: 100,
                maxHP: 767,
                name: 'asdfsadf',
                _ext: true,
                _rev: '1-971bfd0b8749eb33b6aae7f6c0dc2cd4'
            };

            assert.equal(true, q._queryChangeDetector.doesDocMatchQuery(docData));
            col.database.destroy();
        });
    });
    describe('._isDocInResultData()', async() => {
        it('should return true', async() => {
            const col = await humansCollection.create(5);
            const q = col.find();
            await q.exec();
            const resData = q._resultsData;
            assert.equal(q._resultsData.length, 5);
            const is = q._queryChangeDetector._isDocInResultData(resData[0], resData);
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
            const is = q._queryChangeDetector._isDocInResultData(anyDoc, resData);
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
    describe('._resortDocData()', () => {
        it('should return resorted doc-data', async() => {
            const col = await humansCollection.createAgeIndex(3);
            const q = col.find().sort('age');
            const docData1 = schemaObjects.human();
            docData1.age = 5;
            docData1._id = 'aaaaaaaa';
            const docData2 = schemaObjects.human();
            docData2.age = 10;
            docData2._id = 'bbbbbbb';

            const res = q._queryChangeDetector._resortDocData([docData2, docData1]);
            assert.equal(res[0].age, 5);
            assert.equal(res[1].age, 10);

            const res2 = q._queryChangeDetector._resortDocData([docData1, docData2]);
            assert.equal(res2[0].age, 5);
            assert.equal(res2[1].age, 10);

            col.database.destroy();
        });
    });
    describe('._sortFieldChanged()', () => {
        it('should return true', async() => {
            const col = await humansCollection.createAgeIndex(0);

            const q = col.find().sort('age');
            const docDataBefore = schemaObjects.human();
            docDataBefore.age = 5;
            const docDataAfter = clone(docDataBefore);
            docDataAfter.age = 10;

            const changed = q._queryChangeDetector._sortFieldChanged(docDataBefore, docDataAfter);
            assert.equal(changed, true);
            col.database.destroy();
        });
        it('should return false', async() => {
            const col = await humansCollection.createAgeIndex(0);

            const q = col.find().sort('age');
            const docDataBefore = schemaObjects.human();
            const docDataAfter = clone(docDataBefore);

            const changed = q._queryChangeDetector._sortFieldChanged(docDataBefore, docDataAfter);
            assert.equal(changed, false);
            col.database.destroy();
        });
    });
    describe('.handleSingleChange()', () => {
        describe('R1 (removed and never matched)', () => {
            it('should jump in and return false', async() => {
                const col = await humansCollection.createPrimary(0);
                const q = col.find().where('firstName').ne('Alice');
                const changeEvents = [];
                const docData = schemaObjects.simpleHuman();
                docData.passportId = 'foobar';
                docData.firstName = 'Alice';
                await col.insert(docData);
                col.$.first().toPromise().then(cE => changeEvents.push(cE));
                await col.findOne('foobar').remove();
                await util.waitUntil(() => changeEvents.length == 1);
                const res = q._queryChangeDetector.handleSingleChange([], changeEvents[0]);
                assert.equal(res, false);
            });
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
        describe('all constellations', () => {
            it('R1: doc which did not match, was removed', async() => {
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
            it('R2: doc which was before first result was removed', async() => {
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
            it('R3: doc which was in results got removed', async() => {
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
            it('R4: sorted after and got removed', async() => {
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
            it('U1: not matched and not matches now', async() => {
                const col = await humansCollection.create(4);

                const other = schemaObjects.human();
                other.passportId = 'foobar';
                const otherDoc = await col.insert(other);

                const q = col.find().where('passportId').ne('foobar');
                let results = await q.exec();
                assert.equal(results.length, 4);
                assert.equal(q._execOverDatabaseCount, 1);


                otherDoc.firstName = 'piotr';
                await otherDoc.save();

                results = await q.exec();
                assert.equal(results.length, 4);
                assert.equal(q._execOverDatabaseCount, 1);

                col.database.destroy();
            });
            it('U2: still matching', async() => {
                const col = await humansCollection.createAgeIndex(5);
                const q = col.find().sort('age');
                let results = await q.exec();
                assert.equal(results.length, 5);
                assert.equal(q._execOverDatabaseCount, 1);

                const oneDoc = await col.findOne().skip(2).exec();
                oneDoc.age = 1;
                await oneDoc.save();

                results = await q.exec();
                assert.equal(results.length, 5);
                assert.equal(q._execOverDatabaseCount, 1);
                assert.equal(results[0].age, 1);
            });
        });

    });

    describe('e', () => {
        //    it('e', () => process.exit());
    });
});
