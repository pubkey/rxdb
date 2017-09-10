/**
 * this tests the reactive behaviour of RxDocument
 */

import assert from 'assert';
import AsyncTestUtil from 'async-test-util';

import * as humansCollection from '../helper/humans-collection';
import * as util from '../../dist/lib/util';

describe('reactive-document.test.js', () => {
    describe('.save()', () => {
        describe('positive', () => {
            it('should fire on save', async() => {
                const c = await humansCollection.create();
                const doc = await c.findOne().exec();
                doc.set('firstName', util.randomCouchString(8));
                doc.save();
                const changeEvent = await doc.$.first().toPromise();
                assert.equal(changeEvent._id, doc.getPrimary());
                c.database.destroy();
            });
            it('should observe a single field', async() => {
                const c = await humansCollection.create();
                const doc = await c.findOne().exec();
                const valueObj = {
                    v: doc.get('firstName')
                };
                doc.get$('firstName').subscribe(newVal => {
                    valueObj.v = newVal;
                });
                const setName = util.randomCouchString(10);
                doc.set('firstName', setName);
                await doc.save();
                await util.promiseWait(5);
                assert.equal(valueObj.v, setName);
                c.database.destroy();
            });
            it('should observe a nested field', async() => {
                const c = await humansCollection.createNested();
                const doc = await c.findOne().exec();
                const valueObj = {
                    v: doc.get('mainSkill.name')
                };
                doc.get$('mainSkill.name').subscribe(newVal => {
                    valueObj.v = newVal;
                });
                const setName = util.randomCouchString(10);
                doc.set('mainSkill.name', setName);
                await doc.save();
                util.promiseWait(5);
                assert.equal(valueObj.v, setName);
                c.database.destroy();
            });
            it('get equal values when subscribing again later', async() => {
                const c = await humansCollection.create(1);
                const doc = await c.findOne().exec();
                let v1;
                const sub = doc.get$('firstName').subscribe(newVal => v1 = newVal);
                await util.promiseWait(5);

                doc.set('firstName', 'foobar');
                await doc.save();

                let v2;
                doc.get$('firstName').subscribe(newVal => v2 = newVal);

                assert.equal(v1, v2);
                assert.equal(v1, 'foobar');
                sub.unsubscribe();
                c.database.destroy();
            });
        });
        describe('negative', () => {
            it('cannot observe non-existend field', async() => {
                const c = await humansCollection.create();
                const doc = await c.findOne().exec();
                await AsyncTestUtil.assertThrows(
                    () => doc.get$('foobar').subscribe(newVal => newVal),
                    Error
                );
                c.database.destroy();
            });
        });
    });
    describe('.deleted$', () => {
        describe('positive', () => {
            it('deleted$ is true, on delete', async() => {
                const c = await humansCollection.create();
                const doc = await c.findOne().exec();
                let deleted = null;
                doc.deleted$.subscribe(v => deleted = v);
                util.promiseWait(5);
                assert.deepEqual(deleted, false);
                await doc.remove();
                util.promiseWait(5);
                assert.deepEqual(deleted, true);
                c.database.destroy();
            });
        });
        describe('negative', () => {});
    });
    describe('synced$', () => {
        describe('positive', () => {
            it('should be in sync when unchanged document gets changed by other instance', async() => {
                const name = util.randomCouchString(10);
                const c1 = await humansCollection.createMultiInstance(name, 1);
                const c2 = await humansCollection.createMultiInstance(name, 0);
                const doc = await c1.findOne().exec();
                const doc2 = await c2.findOne().exec();
                assert.deepEqual(doc.firstName, doc2.firstName);
                assert.notEqual(doc, doc2);

                const ok = await doc.synced$.first().toPromise();
                assert.ok(ok);

                doc2.firstName = 'foobar';
                await doc2.save();

                await AsyncTestUtil.waitUntil(async() => {
                    await c1.database.socket.pull();
                    await c2.database.socket.pull();
                    return doc.firstName === 'foobar';
                });
                assert.equal(doc.firstName, 'foobar');

                const ok2 = await doc.synced$.first().toPromise();
                assert.ok(ok2);

                c1.database.destroy();
                c2.database.destroy();

            });
            it('should not be in sync when changed document gets changed by other instance', async() => {
                const name = util.randomCouchString(10);
                const c1 = await humansCollection.createMultiInstance(name, 1);
                const c2 = await humansCollection.createMultiInstance(name, 0);
                const doc = await c1.findOne().exec();
                const doc2 = await c2.findOne().exec();
                assert.deepEqual(doc.firstName, doc2.firstName);
                assert.notEqual(doc, doc2);

                doc.firstName = 'foobar1';
                doc2.firstName = 'foobar2';
                await doc2.save();

                await AsyncTestUtil.waitUntil(async() => {
                    await c1.database.socket.pull();
                    await c2.database.socket.pull();
                    return doc.firstName === 'foobar1';
                });
                assert.equal(doc.firstName, 'foobar1');

                await AsyncTestUtil.waitUntil(async() => {
                    const notOk = await doc.synced$.first().toPromise();
                    return !notOk;
                });
                const notOk = await doc.synced$.first().toPromise();
                assert.ok(!notOk);

                c1.database.destroy();
                c2.database.destroy();
            });
            it('should be in sync again when unsync doc saves', async() => {
                const name = util.randomCouchString(10);
                const c1 = await humansCollection.createMultiInstance(name, 1);
                const c2 = await humansCollection.createMultiInstance(name, 0);
                const doc = await c1.findOne().exec();
                const doc2 = await c2.findOne().exec();
                assert.deepEqual(doc.firstName, doc2.firstName);
                assert.notEqual(doc, doc2);

                doc.firstName = 'foobar1';

                // unsyc
                doc2.firstName = 'foobar2';
                await doc2.save();

                await AsyncTestUtil.waitUntil(async() => {
                    await c1.database.socket.pull();
                    await c2.database.socket.pull();
                    const notOk = await doc.synced$.first().toPromise();
                    return !notOk;
                });

                // resync
                await doc.save();

                await AsyncTestUtil.waitUntil(async() => {
                    await c1.database.socket.pull();
                    await c2.database.socket.pull();
                    const ok = await doc.synced$.first().toPromise();
                    return ok;
                });

                c1.database.destroy();
                c2.database.destroy();
            });
        });
        describe('negative', () => {});
    });
    describe('.resync()', () => {
        it('should have the original state after resync()', async() => {
            const c = await humansCollection.create();
            const doc = await c.findOne().exec();
            const orig = doc.firstName;
            doc.firstName = 'foobar';
            await doc.resync();
            assert.equal(orig, doc.firstName);
            c.database.destroy();
        });
        it('should work when resyncing two times', async() => {
            const c = await humansCollection.create();
            const doc = await c.findOne().exec();
            const orig = doc.firstName;
            doc.firstName = 'foobar';
            await doc.resync();
            assert.equal(orig, doc.firstName);

            doc.firstName = 'foobar2';
            await doc.resync();
            assert.equal(orig, doc.firstName);

            c.database.destroy();
        });
    });
});
