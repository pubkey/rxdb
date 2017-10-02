import assert from 'assert';

import * as schemaObjects from '../helper/schema-objects';
import * as humansCollection from '../helper/humans-collection';

import * as util from '../../dist/lib/util';
import AsyncTestUtil from 'async-test-util';

describe('reactive-query.test.js', () => {
    describe('positive', () => {
        it('get results of array when .subscribe() and filled array later', async() => {
            const c = await humansCollection.create(1);
            const query = c.find();
            let lastValue = null;
            let count = 0;
            query.$.subscribe(newResults => {
                count++;
                lastValue = newResults;
            });
            await AsyncTestUtil.waitUntil(() => count === 1);
            assert.ok(lastValue);
            assert.equal(lastValue.length, 1);
            assert.equal(count, 1);
            c.database.destroy();
        });
        it('get the updated docs on Collection.insert()', async() => {
            const c = await humansCollection.create(1);
            const query = c.find();
            let lastValue = [];
            let pw8 = AsyncTestUtil.waitResolveable(500);
            query.$.subscribe(newResults => {
                lastValue = newResults;
                if (!!newResults) pw8.resolve();
            });
            await pw8.promise;
            assert.equal(lastValue.length, 1);

            const addHuman = schemaObjects.human();
            pw8 = AsyncTestUtil.waitResolveable(500);
            await c.insert(addHuman);
            await pw8.promise;
            assert.equal(lastValue.length, 2);

            let isHere = false;
            lastValue.map(doc => {
                if (doc.get('passportId') === addHuman.passportId)
                    isHere = true;
            });
            assert.ok(isHere);
            c.database.destroy();
        });
        it('get the value twice when subscribing 2 times', async() => {
            const c = await humansCollection.create(1);
            const query = c.find();
            let lastValue = [];
            query.$.subscribe(newResults => {
                lastValue = newResults;
            });
            let lastValue2 = [];
            query.$.subscribe(newResults => {
                lastValue2 = newResults;
            });
            await util.promiseWait(100);

            await AsyncTestUtil.waitUntil(() => lastValue2 && lastValue2.length === 1);
            assert.deepEqual(lastValue, lastValue2);
            c.database.destroy();
        });
        it('get the base-value when subscribing again later', async() => {
            const c = await humansCollection.create(1);
            const query = c.find();
            let lastValue = [];
            query.$.subscribe(newResults => {
                lastValue = newResults;
            });
            await AsyncTestUtil.waitUntil(() => lastValue.length > 0);
            let lastValue2 = [];
            query.$.subscribe(newResults => {
                lastValue2 = newResults;
            });
            await AsyncTestUtil.waitUntil(() => lastValue2.length > 0);
            await util.promiseWait(10);
            assert.equal(lastValue2.length, 1);
            assert.deepEqual(lastValue, lastValue2);
            c.database.destroy();
        });
        it('get new values on Document.save', async() => {
            const c = await humansCollection.create(1);
            const doc = await c.findOne().exec();
            let pw8 = AsyncTestUtil.waitResolveable(500);

            let values;
            const querySub = c.find({
                firstName: doc.get('firstName')
            }).$.subscribe(newV => {
                values = newV;
                if (!!newV) pw8.resolve();
            });

            await pw8.promise;
            assert.equal(values.length, 1);

            // change doc so query does not match
            doc.set('firstName', 'foobar');
            pw8 = AsyncTestUtil.waitResolveable(500);
            await doc.save();
            await pw8.promise;
            assert.equal(values.length, 0);
            querySub.unsubscribe();
            c.database.destroy();
        });


        /**
         * @link https://github.com/pubkey/rxdb/issues/31
         */
        it('do not fire on doc-change when result-doc not affected', async() => {
            const c = await humansCollection.createAgeIndex(10);
            // take only 9 of 10
            const valuesAr = [];
            let pw8 = AsyncTestUtil.waitResolveable(300);
            const querySub = c.find()
                .limit(9)
                .sort('age')
                .$
                .do(() => pw8.resolve())
                .filter(x => x !== null)
                .subscribe(newV => valuesAr.push(newV));

            // get the 10th
            const doc = await c.findOne()
                .sort({
                    age: -1
                })
                .exec();

            await pw8.promise;
            assert.equal(valuesAr.length, 1);

            // edit+save doc
            pw8 = AsyncTestUtil.waitResolveable(300);
            doc.firstName = 'foobar';
            await doc.save();
            await pw8.promise;

            await util.promiseWait(20);
            assert.equal(valuesAr.length, 1);
            querySub.unsubscribe();
            c.database.destroy();
        });

        it('BUG: should have the document in DocCache when getting it from observe', async() => {
            const name = util.randomCouchString(10);
            const c = await humansCollection.createPrimary(1, name);
            const c2 = await humansCollection.createPrimary(0, name);
            const doc = await c.findOne().exec();
            const docId = doc.primary;

            assert.deepEqual(c2._docCache.get(docId), undefined);

            const results = [];
            const sub = c2.find().$.subscribe(docs => results.push(docs));
            await AsyncTestUtil.waitUntil(() => results.length >= 1);

            assert.equal(c2._docCache.get(docId).primary, docId);

            sub.unsubscribe();
            c.database.destroy();
            c2.database.destroy();
        });

        it('BUG #136 : findOne(string).$ streams all documents (_id as primary)', async() => {
            const subs = [];
            const col = await humansCollection.create(3);
            const docData = schemaObjects.human();
            const doc = await col.insert(docData);
            const _id = doc._id;
            const streamed = [];
            subs.push(
                col.findOne(_id).$
                .filter(doc => doc !== null)
                .subscribe(doc => {
                    streamed.push(doc);
                })
            );
            await AsyncTestUtil.waitUntil(() => streamed.length === 1);
            assert.equal(streamed[0].constructor.name, 'RxDocument');
            assert.equal(streamed[0]._id, _id);

            const streamed2 = [];
            subs.push(
                col.findOne().where('_id').eq(_id).$
                .filter(doc => doc !== null)
                .subscribe(doc => {
                    streamed2.push(doc);
                })
            );
            await AsyncTestUtil.waitUntil(() => streamed2.length === 1);
            assert.equal(streamed2.length, 1);
            assert.equal(streamed2[0].constructor.name, 'RxDocument');
            assert.equal(streamed2[0]._id, _id);

            subs.forEach(sub => sub.unsubscribe());
            col.database.destroy();
        });

        it('BUG #138 : findOne().$ returns every doc if no id given', async() => {
            const col = await humansCollection.create(3);
            const streamed = [];
            const sub = col.findOne().$
                .filter(doc => doc !== null)
                .subscribe(doc => {
                    streamed.push(doc);
                });
            await AsyncTestUtil.waitUntil(() => streamed.length === 1);
            assert.equal(streamed.length, 1);
            assert.equal(streamed[0].constructor.name, 'RxDocument');
            sub.unsubscribe();
            col.database.destroy();
        });
    });
    describe('negative', () => {
        it('get no change when nothing happens', async() => {
            const c = await humansCollection.create(1);
            const query = c.find();
            let recieved = 0;
            const querySub = query.$.subscribe(() => {
                recieved++;
            });
            await AsyncTestUtil.waitUntil(() => recieved === 1);
            querySub.unsubscribe();
            c.database.destroy();
        });
    });
});
