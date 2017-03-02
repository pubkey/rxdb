import assert from 'assert';
import * as _ from 'lodash';


import * as humansCollection from './../helper/humans-collection';
import * as schemaObjects from '../helper/schema-objects';
import * as util from '../../dist/lib/util';
import * as RxDocument from '../../dist/lib/RxDocument';

process.on('unhandledRejection', function(err) {
    throw err;
});

describe('RxDocument.test.js', () => {
    describe('statics', () => {
        describe('.isDeepEqual()', () => {
            it('should true on standard object', () => {
                const is = RxDocument.isDeepEqual({
                    foo: 'baar'
                }, {
                    foo: 'baar'
                });
                assert.ok(is);
            });
            it('should false on standard object', () => {
                const is = RxDocument.isDeepEqual({
                    foo: 'baar'
                }, {
                    foo: 'baar1'
                });
                assert.equal(is, false);
            });
            it('should true on array', () => {
                const is = RxDocument.isDeepEqual([{
                    foo: 'baar'
                }], [{
                    foo: 'baar'
                }]);
                assert.ok(is);
            });
            it('should false on array', () => {
                const is = RxDocument.isDeepEqual([{
                    foo: 'baar'
                }], [{
                    foo: 'baar2'
                }]);
                assert.equal(is, false);
            });
            it('should true on getter', () => {
                const obj1 = {};
                obj1.__defineGetter__('foo', () => 'bar');
                const obj2 = {};
                obj2.__defineGetter__('foo', () => 'bar');
                assert.ok(RxDocument.isDeepEqual(obj1, obj2));
            });
            it('should false on different getter', () => {
                const obj1 = {};
                obj1.__defineGetter__('foo', () => 'bar');
                const obj2 = {};
                obj2.__defineGetter__('foo', () => 'bar1');
                assert.equal(RxDocument.isDeepEqual(obj1, obj2), false);
            });
            it('should ignore getter which endsWith $', () => {
                const obj1 = {};
                obj1.__defineGetter__('foo', () => 'bar');
                obj1.__defineGetter__('foo$', () => 'bar');
                const obj2 = {};
                obj2.__defineGetter__('foo', () => 'bar');
                assert.ok(RxDocument.isDeepEqual(obj1, obj2));
            });

        });
    });
    describe('.get()', () => {
        describe('positive', () => {
            it('get a value', async() => {
                const c = await humansCollection.create(1);
                const doc = await c.findOne().exec();
                const value = doc.get('passportId');
                assert.equal(typeof value, 'string');
                c.database.destroy();
            });
            it('get a nested value', async() => {
                const c = await humansCollection.createNested(5);
                const doc = await c.findOne().exec();
                const value = doc.get('mainSkill.name');
                assert.equal(typeof value, 'string');
                const value2 = doc.get('mainSkill.level');
                assert.equal(typeof value2, 'number');
                c.database.destroy();
            });
            it('get null on undefined value', async() => {
                const c = await humansCollection.createNested(5);
                const doc = await c.findOne().exec();
                const value = doc.get('foobar');
                assert.equal(value, null);
                c.database.destroy();
            });
        });
        describe('negative', () => {
            it('throw if no string', async() => {
                const c = await humansCollection.createNested(5);
                const doc = await c.findOne().exec();
                const path = {
                    foo: 'bar'
                };
                await util.assertThrowsAsync(
                    () => doc.get(path),
                    TypeError
                );
                c.database.destroy();
            });
        });
    });
    describe('.set()', () => {
        describe('positive', () => {
            it('set the value', async() => {
                const c = await humansCollection.createNested(5);
                const doc = await c.findOne().exec();
                const val = 'bliebla';
                doc.set('passportId', val);
                assert.equal(doc._data.passportId, val);
                assert.equal(doc.get('passportId'), val);
                c.database.destroy();
            });
            it('set object', async() => {
                const c = await humansCollection.createNested(5);
                const doc = await c.findOne().exec();
                const val = {
                    name: 'newSkill',
                    level: 2
                };
                doc.set('mainSkill', val);
                assert.equal(doc._data.mainSkill.name, val.name);
                assert.equal(doc.get('mainSkill.name'), val.name);
                assert.equal(doc._data.mainSkill.level, val.level);
                assert.equal(doc.get('mainSkill.level'), val.level);
                c.database.destroy();
            });
            it('set nested', async() => {
                const c = await humansCollection.createNested(5);
                const doc = await c.findOne().exec();
                const val = 'newSkill';
                doc.set('mainSkill.name', val);
                assert.equal(doc._data.mainSkill.name, val);
                assert.equal(doc.get('mainSkill.name'), val);
                c.database.destroy();
            });
        });
        describe('negative', () => {
            it('throw if no string', async() => {
                const c = await humansCollection.createNested(5);
                const doc = await c.findOne().exec();
                const path = {
                    foo: 'bar'
                };
                await util.assertThrowsAsync(
                    () => doc.set(path, 'foo'),
                    TypeError
                );
                c.database.destroy();
            });
            it('throw if not validates schema', async() => {
                const c = await humansCollection.createNested(5);
                const doc = await c.findOne().exec();
                const val = {
                    foo: 'bar'
                };
                await util.assertThrowsAsync(
                    () => doc.set('passportId', val),
                    Error
                );
                c.database.destroy();
            });
            it('throw if not validates schema (additional property)', async() => {
                const c = await humansCollection.createNested(5);
                const doc = await c.findOne().exec();
                const val = 'bliebla';
                await util.assertThrowsAsync(
                    () => doc.set('newone', val),
                    Error
                );
                c.database.destroy();
            });
            it('cannot modifiy _id', async() => {
                const c = await humansCollection.createNested(5);
                const doc = await c.findOne().exec();
                const val = 'bliebla';
                await util.assertThrowsAsync(
                    () => doc.set('_id', val),
                    Error
                );
                c.database.destroy();
            });
        });
    });
    describe('.save()', () => {
        describe('positive', () => {
            it('save', async() => {
                const c = await humansCollection.createNested(5);
                const doc = await c.findOne().exec();
                const val = 'bliebla';
                doc.set('passportId', val);
                await doc.save();
                const docNew = await c.findOne().exec();
                assert.equal(docNew.get('passportId'), val);
                c.database.destroy();
            });
            it('save object', async() => {
                const c = await humansCollection.createNested(10);
                const doc = await c.findOne().exec();
                const val = {
                    name: util.randomCouchString(20),
                    level: 5
                };
                doc.set('mainSkill', val);
                await doc.save();
                const doc2 = await c.findOne().exec();
                assert.deepEqual(doc2.get('mainSkill.name'), val.name);
                assert.deepEqual(doc2.get('mainSkill.level'), val.level);
                c.database.destroy();
            });
            it('save twice', async() => {
                const c = await humansCollection.createNested(5);
                const doc = await c.findOne().exec();
                const val1 = 'bliebla1';
                const val2 = 'bliebla2';
                doc.set('passportId', val1);
                await doc.save();
                const docNew = await c.findOne().exec();
                assert.equal(docNew.get('passportId'), val1);
                docNew.set('passportId', val1);

                const docNew2 = await c.findOne().exec();
                docNew2.set('passportId', val2);
                await docNew2.save();
                assert.equal(docNew2.get('passportId'), val2);
                c.database.destroy();
            });
            it('.save() returns false when data not changed', async() => {
                const c = await humansCollection.create(10);
                const doc = await c.findOne().exec();
                const r = await doc.save();
                assert.equal(r, false);
            });
            it('.save() returns true data changed', async() => {
                const c = await humansCollection.create(10);
                const doc = await c.findOne().exec();
                doc.passportId = util.randomCouchString(20);
                const r = await doc.save();
                assert.equal(r, true);
            });
        });
        describe('negative', () => {
            it('save deleted', async() => {
                const c = await humansCollection.createNested(5);
                const doc = await c.findOne().exec();
                await doc.remove();
                doc.set('passportId', 'any');
                await util.assertThrowsAsync(
                    () => doc.save(),
                    Error
                );
                c.database.destroy();
            });
        });
    });
    describe('.remove()', () => {
        describe('positive', () => {
            it('delete 1 document', async() => {
                const c = await humansCollection.create(5);
                const docs = await c.find().exec();
                assert.ok(docs.length > 1);
                const first = docs[0];
                await first.remove();
                const docsAfter = await c.find().exec();
                docsAfter.map(doc => {
                    if (doc._data.passportId == first._data.passportId)
                        throw new Error('still here after remove()');
                });
                c.database.destroy();
            });
            it('delete all in parrallel', async() => {
                const c = await humansCollection.create(5);
                const docs = await c.find().exec();
                const fns = [];
                docs.map(doc => fns.push(doc.remove()));
                await Promise.all(fns);
                const docsAfter = await c.find().exec();
                assert.equal(docsAfter.length, 0);
                c.database.destroy();
            });
            it('save and then remove', async() => {
                const c = await humansCollection.create(5);
                const docs = await c.find().exec();
                assert.ok(docs.length > 1);
                const first = docs[0];

                first.firstName = 'foobar';
                await first.save();

                await first.remove();
                const docsAfter = await c.find().exec();
                docsAfter.map(doc => {
                    if (doc._data.passportId == first._data.passportId)
                        throw new Error('still here after remove()');
                });
                c.database.destroy();
            });
        });
        describe('negative', () => {
            it('delete doc twice', async() => {
                const c = await humansCollection.create(5);
                const doc = await c.findOne().exec();
                await doc.remove();
                await util.assertThrowsAsync(
                    () => doc.remove(),
                    Error
                );
                c.database.destroy();
            });
        });
    });
    describe('pseudo-Proxy', () => {
        describe('get', () => {
            it('top-value', async() => {
                const c = await humansCollection.create(1);
                const doc = await c.findOne().exec();
                const passportId = doc.get('passportId');
                assert.equal(doc.passportId, passportId);
            });
            it('nested-value', async() => {
                const c = await humansCollection.createNested(1);
                const doc = await c.findOne().exec();
                const mainSkillLevel = doc.get('mainSkill.level');
                assert.equal(doc.mainSkill.level, mainSkillLevel);
            });
            it('deep-nested-value', async() => {
                const c = await humansCollection.createDeepNested(1);
                const doc = await c.findOne().exec();
                const value = doc.get('mainSkill.attack.count');
                assert.equal(doc.mainSkill.attack.count, value);

                const value2 = doc.get('mainSkill.attack.good');
                assert.equal(doc.mainSkill.attack.good, value2);
            });
            it('top-value-observable', async() => {
                const c = await humansCollection.create(1);
                const doc = await c.findOne().exec();
                const obs = doc.firstName$;
                assert.equal(obs.constructor.name, 'Observable');

                let value = null;
                obs.subscribe(newVal => {
                    value = newVal;
                });
                doc.set('firstName', 'foobar');
                await doc.save();
                await util.promiseWait(5);
                assert.equal(value, 'foobar');

                // resubscribe should emit again
                let value2 = null;
                obs.subscribe(newVal => {
                    value2 = newVal;
                });
                await util.promiseWait(5);
                assert.equal(value2, 'foobar');

            });
            it('nested-value-observable', async() => {
                const c = await humansCollection.createNested(1);
                const doc = await c.findOne().exec();
                const obs = doc.mainSkill.level$;
                assert.equal(obs.constructor.name, 'Observable');

                let value = null;
                doc.mainSkill.level$.subscribe(newVal => {
                    value = newVal;
                });
                doc.set('mainSkill.level', 10);
                await doc.save();
                await util.promiseWait(5);
                assert.equal(value, 10);
            });
            it('deep-nested-value-observable', async() => {
                const c = await humansCollection.createDeepNested(1);
                const doc = await c.findOne().exec();
                const obs = doc.mainSkill.attack.good$;
                assert.equal(obs.constructor.name, 'Observable');

                let value = null;
                doc.mainSkill.attack.good$.subscribe(newVal => {
                    value = newVal;
                });
                doc.set('mainSkill.attack.good', true);
                await doc.save();
                await util.promiseWait(5);
                assert.equal(value, true);
            });
        });
        describe('set', () => {
            it('top value', async() => {
                const c = await humansCollection.createPrimary(1);
                const doc = await c.findOne().exec();
                doc.firstName = 'foobar';
                assert.equal(doc.firstName, 'foobar');
                await doc.save();
                const doc2 = await c.findOne(doc.passportId).exec();
                assert.equal(doc2.firstName, 'foobar');
            });
            it('nested value', async() => {
                const c = await humansCollection.createNested(1);
                const doc = await c.findOne().exec();
                doc.mainSkill.level = 10;
                assert.equal(doc.mainSkill.level, 10);

                await doc.save();
                const doc2 = await c.findOne().exec();
                assert.equal(doc2.mainSkill.level, 10);
            });
            it('deep nested value', async() => {
                const c = await humansCollection.createDeepNested(1);
                const doc = await c.findOne().exec();
                doc.mainSkill.attack.good = true;
                assert.equal(doc.mainSkill.attack.good, true);

                await doc.save();
                const doc2 = await c.findOne().exec();
                assert.equal(doc2.mainSkill.attack.good, true);
            });
        });
    });
    describe('other', () => {
        it('BUG #66 - insert -> remove -> insert does not give new state', async() => {
            const c = await humansCollection.createPrimary(0);
            const docData = schemaObjects.simpleHuman();
            const primary = docData.passportId;
            console.dir(docData);

            // insert
            await c.upsert(docData);
            const doc1 = await c.findOne(primary).exec();
            console.dir(doc1);
            assert.equal(doc1.firstName, docData.firstName);

            // remove
            await doc1.remove();

            // upsert
            docData.firstName = 'foobar';
            await c.upsert(docData);
            const doc2 = await c.findOne(primary).exec();
            assert.equal(doc2.firstName, 'foobar');

            c.database.destroy();
        });
    });
});
