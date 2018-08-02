import assert from 'assert';
import config from './config';
import AsyncTestUtil from 'async-test-util';

import * as humansCollection from './../helper/humans-collection';
import * as schemaObjects from '../helper/schema-objects';
import * as schemas from '../helper/schemas';
import * as util from '../../dist/lib/util';

import * as RxDB from '../../dist/lib/index';
import * as RxDocument from '../../dist/lib/rx-document';
import * as RxDatabase from '../../dist/lib/index';
import * as RxSchema from '../../dist/lib/rx-schema';

config.parallel('rx-document.test.js', () => {
    describe('statics', () => { });
    describe('prototype-merge', () => {

        describe('RxSchema.getDocumentPrototype()', () => {
            it('should get an object with all main-fields', async () => {
                const schema = RxSchema.create(schemas.human);
                assert.ok(schema);
                const proto = schema.getDocumentPrototype();
                assert.ok(proto);
                const testObjData = schemaObjects.human();
                const testObj = {
                    get(path) {
                        return testObjData[path];
                    },
                    get$(path) {
                        return 'Observable:' + path;
                    },
                    populate(path) {
                        return 'Promise:' + path;
                    },
                    set(path, val) {
                        testObjData[path] = val;
                    }
                };
                testObj.__proto__ = proto;

                assert.equal(testObj.passportId, testObjData.passportId);
                Object.keys(testObjData).forEach(k => {
                    assert.equal(testObj[k], testObjData[k]); // getter attribute
                    assert.equal(testObj[k + '$'], 'Observable:' + k); // getter observable
                    assert.equal(testObj[k + '_'], 'Promise:' + k); // getter populate
                    // test setter
                    testObj[k] = 'foo';
                    assert.equal(testObjData[k], 'foo');
                });
            });
        });
        describe('RxCollection.getDocumentOrmPrototype()', () => {
            it('should get a prototype with all orm-methods', async () => {
                const db = await RxDatabase.create({
                    name: util.randomCouchString(10),
                    adapter: 'memory'
                });
                const col = await db.collection({
                    name: 'humans',
                    schema: schemas.humanFinal,
                    methods: {
                        foo() {
                            return 'bar';
                        }
                    }
                });

                const proto = col.getDocumentOrmPrototype();
                const testObj = {};
                testObj.__proto__ = proto;
                assert.equal(testObj.foo(), 'bar');

                db.destroy();
            });
        });
        describe('RxCollection.getDocumentPrototype()', () => {
            it('should get a valid prototype', async () => {
                const db = await RxDatabase.create({
                    name: util.randomCouchString(10),
                    adapter: 'memory'
                });
                const col = await db.collection({
                    name: 'humans',
                    schema: schemas.human,
                    methods: {
                        foo() {
                            return 'bar';
                        }
                    }
                });
                const proto = col.getDocumentPrototype();

                assert.equal(typeof proto.remove, 'function'); // from baseProto
                assert.equal(proto.foo(), 'bar'); // from orm-proto

                db.destroy();
            });
        });

    });
    describe('.get()', () => {
        describe('positive', () => {
            it('get a value', async () => {
                const c = await humansCollection.create(1);
                const doc = await c.findOne().exec();
                const value = doc.get('passportId');
                assert.equal(typeof value, 'string');
                c.database.destroy();
            });
            it('get a nested value', async () => {
                const c = await humansCollection.createNested(5);
                const doc = await c.findOne().exec();
                const value = doc.get('mainSkill.name');
                assert.equal(typeof value, 'string');
                const value2 = doc.get('mainSkill.level');
                assert.equal(typeof value2, 'number');
                c.database.destroy();
            });
            it('get null on undefined value', async () => {
                const c = await humansCollection.createNested(5);
                const doc = await c.findOne().exec();
                const value = doc.get('foobar');
                assert.equal(value, null);
                c.database.destroy();
            });
        });
        describe('negative', () => { });
    });
    describe('.set()', () => {
        describe('positive', () => {
            it('set the value', async () => {
                const c = await humansCollection.createNested(5);
                const doc = await c.findOne().exec();
                const val = 'bliebla';
                doc.set('passportId', val);
                assert.equal(doc._data.passportId, val);
                assert.equal(doc.get('passportId'), val);
                c.database.destroy();
            });
            it('set object', async () => {
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
            it('set nested', async () => {
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
            it('throw if no string', async () => {
                const c = await humansCollection.createNested(5);
                const doc = await c.findOne().exec();
                const path = {
                    foo: 'bar'
                };
                await AsyncTestUtil.assertThrows(
                    () => doc.set(path, 'foo'),
                    TypeError
                );
                c.database.destroy();
            });
            it('throw if not validates schema', async () => {
                const c = await humansCollection.createNested(5);
                const doc = await c.findOne().exec();
                const val = {
                    foo: 'bar'
                };
                await AsyncTestUtil.assertThrows(
                    () => doc.set('passportId', val),
                    Error
                );
                c.database.destroy();
            });
            it('throw if not validates schema (additional property)', async () => {
                const c = await humansCollection.createNested(5);
                const doc = await c.findOne().exec();
                const val = 'bliebla';
                await AsyncTestUtil.assertThrows(
                    () => doc.set('newone', val),
                    Error
                );
                c.database.destroy();
            });
            it('cannot modifiy _id', async () => {
                const c = await humansCollection.createNested(5);
                const doc = await c.findOne().exec();
                const val = 'bliebla';
                await AsyncTestUtil.assertThrows(
                    () => doc.set('_id', val),
                    Error
                );
                c.database.destroy();
            });
            it('cannot modify final fields', async () => {
                const db = await RxDatabase.create({
                    name: util.randomCouchString(10),
                    adapter: 'memory'
                });
                const col = await db.collection({
                    name: 'humans',
                    schema: schemas.humanFinal
                });

                const docData = schemaObjects.human();
                docData.age = 60;
                await col.insert(docData);
                const doc = await col.findOne().exec();
                assert.ok(doc);

                await AsyncTestUtil.assertThrows(
                    () => doc.age = 70,
                    Error,
                    'final fields'
                );
                db.destroy();
            });
        });
    });
    describe('.save()', () => {
        describe('positive', () => {
            it('save', async () => {
                const c = await humansCollection.createNested(5);
                const doc = await c.findOne().exec();
                const val = 'bliebla';
                doc.set('passportId', val);
                await doc.save();
                const docNew = await c.findOne().exec();
                assert.equal(docNew.get('passportId'), val);
                c.database.destroy();
            });
            it('save object', async () => {
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
            it('save twice', async () => {
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
            it('.save() returns false when data not changed', async () => {
                const c = await humansCollection.create(10);
                const doc = await c.findOne().exec();
                const r = await doc.save();
                assert.equal(r, false);
                c.database.destroy();
            });
            it('.save() returns true data changed', async () => {
                const c = await humansCollection.create(10);
                const doc = await c.findOne().exec();
                doc.passportId = util.randomCouchString(20);
                const r = await doc.save();
                assert.equal(r, true);
                c.database.destroy();
            });
        });
        describe('negative', () => {
            it('save deleted', async () => {
                const c = await humansCollection.createNested(5);
                const doc = await c.findOne().exec();
                await doc.remove();
                doc.set('passportId', 'any');
                await AsyncTestUtil.assertThrows(
                    () => doc.save(),
                    Error
                );
                c.database.destroy();
            });
        });
    });
    describe('.remove()', () => {
        describe('positive', () => {
            it('delete 1 document', async () => {
                const c = await humansCollection.create(5);
                const docs = await c.find().exec();
                assert.ok(docs.length > 1);
                const first = docs[0];
                await first.remove();
                const docsAfter = await c.find().exec();
                docsAfter.map(doc => {
                    if (doc._data.passportId === first._data.passportId)
                        throw new Error('still here after remove()');
                });
                c.database.destroy();
            });
            it('should remove all revisions', async () => {
                const c = await humansCollection.create(1);
                const doc = await c.findOne().exec();
                assert.ok(doc);

                // update some times to generate revisions
                doc.age = doc.age + 1;
                await doc.save();
                doc.age = doc.age + 1;
                await doc.save();
                doc.age = 100;
                await doc.save();
                const doc2 = await c.findOne().exec();
                assert.equal(doc2.age, 100);

                await doc2.remove();
                const doc3 = await c.findOne().exec();
                assert.equal(doc3, null);

                c.database.destroy();
            });
            it('delete all in parrallel', async () => {
                const c = await humansCollection.create(5);
                const docs = await c.find().exec();
                const fns = [];
                docs.map(doc => fns.push(doc.remove()));
                await Promise.all(fns);
                const docsAfter = await c.find().exec();
                assert.equal(docsAfter.length, 0);
                c.database.destroy();
            });
            it('save and then remove', async () => {
                const c = await humansCollection.create(5);
                const docs = await c.find().exec();
                assert.ok(docs.length > 1);
                const first = docs[0];

                first.firstName = 'foobar';
                await first.save();

                await first.remove();
                const docsAfter = await c.find().exec();
                docsAfter.map(doc => {
                    if (doc._data.passportId === first._data.passportId)
                        throw new Error('still here after remove()');
                });
                c.database.destroy();
            });
        });
        describe('negative', () => {
            it('delete doc twice', async () => {
                const c = await humansCollection.create(5);
                const doc = await c.findOne().exec();
                await doc.remove();
                await AsyncTestUtil.assertThrows(
                    () => doc.remove(),
                    Error
                );
                c.database.destroy();
            });
        });
    });
    describe('.update()', () => {
        describe('positive', () => {
            it('$set a value with a mongo like query', async () => {
                const c = await humansCollection.createPrimary(1);
                const doc = await c.findOne().exec();
                await doc.update({
                    $set: {
                        firstName: 'new first name'
                    }
                });
                const updatedDoc = await c.findOne({
                    firstName: 'new first name'
                }).exec();
                assert.equal(updatedDoc.firstName, 'new first name');
                c.database.destroy();
            });
            it('$unset a value with a mongo like query', async () => {
                const c = await humansCollection.create(1);
                const doc = await c.findOne().exec();
                await doc.update({
                    $unset: {
                        age: ''
                    }
                });
                const updatedDoc = await c.findOne().exec();
                assert.equal(updatedDoc.age, undefined);
                c.database.destroy();
            });
            it('$inc a value with a mongo like query', async () => {
                const c = await humansCollection.create(1);
                const doc = await c.findOne().exec();
                const agePrev = doc.age;
                await doc.update({
                    $inc: {
                        age: 1
                    }
                });
                assert.equal(doc.age, agePrev + 1);
                await doc.save;
                const updatedDoc = await c.findOne().exec();
                assert.equal(updatedDoc.age, agePrev + 1);
                c.database.destroy();
            });
        });
        describe('negative', () => {
            it('should throw if schema does not match', async () => {
                const schema = {
                    $id: '#child-def',
                    version: 0,
                    properties: {
                        childProperty: {
                            type: 'string',
                            enum: ['A', 'B', 'C']
                        }
                    }
                };
                const db = await RxDB.create({
                    name: util.randomCouchString(10),
                    adapter: 'memory'
                });
                const col = await db.collection({
                    name: 'humans',
                    schema
                });

                // on doc
                const doc = await col.insert({
                    childProperty: 'A'
                });
                await AsyncTestUtil.assertThrows(
                    () => doc.update({
                        $set: {
                            childProperty: 'Z'
                        }
                    }),
                    Error,
                    'schema'
                );
                db.destroy();
            });
        });
    });
    describe('.atomicUpdate()', () => {
        describe('positive', () => {
            it('run one update', async () => {
                const c = await humansCollection.createNested(1);
                const doc = await c.findOne().exec();

                const returnedDoc = await doc.atomicUpdate((innerDoc) => {
                    innerDoc.firstName = 'foobar';
                });
                assert.equal('foobar', doc.firstName);
                assert.ok(doc === returnedDoc);
                c.database.destroy();
            });
            it('run two updates (last write wins)', async () => {
                const c = await humansCollection.createNested(1);
                const doc = await c.findOne().exec();

                doc.atomicUpdate((innerDoc) => {
                    innerDoc.firstName = 'foobar';
                });
                await doc.atomicUpdate((innerDoc) => {
                    innerDoc.firstName = 'foobar2';
                });
                assert.equal('foobar2', doc.firstName);
                c.database.destroy();
            });
            it('do many updates (last write wins)', async () => {
                const c = await humansCollection.create(1);
                const doc = await c.findOne().exec();
                let lastPromise;
                let t = 0;
                new Array(10).fill(0)
                    .map(() => {
                        t++;
                        return t;
                    })
                    .forEach(x => lastPromise = doc.atomicUpdate(innerDoc => {
                        innerDoc.age = x;
                    }));
                await lastPromise;
                assert.equal(t, doc.age);
                c.database.destroy();
            });
            it('run async functions', async () => {
                const c = await humansCollection.create(1);
                const doc = await c.findOne().exec();
                let lastPromise;
                let t = 0;
                new Array(10).fill(0)
                    .map(() => {
                        t++;
                        return t;
                    })
                    .forEach(x => lastPromise = doc.atomicUpdate(async (innerDoc) => {
                        await util.promiseWait(1);
                        innerDoc.age = x;
                    }));
                await lastPromise;
                assert.equal(t, doc.age);
                c.database.destroy();
            });
            it('should work when inserting on a slow storage', async () => {
                if (!config.platform.isNode()) return;
                // use a 'slow' adapter because memory might be to fast
                const leveldown = require('leveldown');
                const db = await RxDB.create({
                    name: '../test_tmp/' + util.randomCouchString(10),
                    adapter: leveldown
                });
                const c = await db.collection({
                    name: 'humans',
                    schema: schemas.primaryHuman
                });
                await c.insert(schemaObjects.simpleHuman());
                const doc = await c.findOne().exec();
                doc.atomicUpdate((innerDoc) => {
                    innerDoc.firstName = 'foobar';
                });
                await doc.atomicUpdate((innerDoc) => {
                    innerDoc.firstName = 'foobar2';
                });
                await AsyncTestUtil.wait(50);
                await doc.atomicUpdate((innerDoc) => {
                    innerDoc.firstName = 'foobar3';
                });
                assert.equal('foobar3', doc.firstName);

                db.destroy();
            });
            it('should be persistent when re-creating the database', async () => {
                if (!config.platform.isNode()) return;
                // use a 'slow' adapter because memory might be to fast
                const leveldown = require('leveldown');

                const dbName = '../test_tmp/' + util.randomCouchString(10);
                const db = await RxDB.create({
                    name: dbName,
                    adapter: leveldown
                });
                const c = await db.collection({
                    name: 'humans',
                    schema: schemas.primaryHuman
                });
                await c.insert(schemaObjects.simpleHuman());
                const doc = await c.findOne().exec();
                const docData = doc.toJSON();
                assert.ok(docData);
                await doc.atomicUpdate(innerDoc => innerDoc.firstName = 'foobar');
                assert.equal(doc.firstName, 'foobar');
                await db.destroy();

                // same again
                const db2 = await RxDB.create({
                    name: dbName,
                    adapter: leveldown
                });
                const c2 = await db2.collection({
                    name: 'humans',
                    schema: schemas.primaryHuman
                });
                const doc2 = await c2.findOne().exec();
                assert.equal(doc.passportId, doc2.passportId);
                const docData2 = doc2.toJSON();
                assert.ok(docData2);
                assert.equal(doc2.firstName, 'foobar');
                db2.destroy();
            });
        });
        describe('negative', () => {
            it('should throw when not matching schema', async () => {
                const c = await humansCollection.create(1);
                const doc = await c.findOne().exec();
                await doc.atomicUpdate(innerDoc => {
                    assert.ok(RxDocument.isInstanceOf(innerDoc));
                    innerDoc.age = 50;
                });
                assert.equal(doc.age, 50);
                await AsyncTestUtil.assertThrows(
                    () => doc.atomicUpdate(innerDoc => {
                        innerDoc.age = 'foobar';
                    }),
                    Error,
                    'schema'
                );
                c.database.destroy();
            });
        });
    });
    describe('pseudo-Proxy', () => {
        describe('get', () => {
            it('top-value', async () => {
                const c = await humansCollection.create(1);
                const doc = await c.findOne().exec();
                const passportId = doc.get('passportId');
                assert.equal(doc.passportId, passportId);
                c.database.destroy();
            });
            it('hidden properties should not show up', async () => {
                const c = await humansCollection.create(1);
                const doc = await c.findOne().exec();
                assert.ok(!Object.keys(doc).includes('lastName_'));
                c.database.destroy();
            });
            it('nested-value', async () => {
                const c = await humansCollection.createNested(1);
                const doc = await c.findOne().exec();
                const mainSkillLevel = doc.get('mainSkill.level');
                assert.equal(doc.mainSkill.level, mainSkillLevel);
                c.database.destroy();
            });
            it('deep-nested-value', async () => {
                const c = await humansCollection.createDeepNested(1);
                const doc = await c.findOne().exec();
                const value = doc.get('mainSkill.attack.count');
                assert.equal(doc.mainSkill.attack.count, value);

                const value2 = doc.get('mainSkill.attack.good');
                assert.equal(doc.mainSkill.attack.good, value2);
                c.database.destroy();
            });
            it('top-value-observable', async () => {
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
                c.database.destroy();
            });
            it('nested-value-observable', async () => {
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
                c.database.destroy();
            });
            it('deep-nested-value-observable', async () => {
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
                c.database.destroy();
            });
        });
        describe('set', () => {
            it('top value', async () => {
                const c = await humansCollection.createPrimary(1);
                const doc = await c.findOne().exec();
                doc.firstName = 'foobar';
                assert.equal(doc.firstName, 'foobar');
                await doc.save();
                const doc2 = await c.findOne(doc.passportId).exec();
                assert.equal(doc2.firstName, 'foobar');
                c.database.destroy();
            });
            it('nested value', async () => {
                const c = await humansCollection.createNested(1);
                const doc = await c.findOne().exec();
                doc.mainSkill.level = 10;
                assert.equal(doc.mainSkill.level, 10);

                await doc.save();
                const doc2 = await c.findOne().exec();
                assert.equal(doc2.mainSkill.level, 10);
                c.database.destroy();
            });
            it('deep nested value', async () => {
                const c = await humansCollection.createDeepNested(1);
                const doc = await c.findOne().exec();
                doc.mainSkill.attack.good = true;
                assert.equal(doc.mainSkill.attack.good, true);

                await doc.save();
                const doc2 = await c.findOne().exec();
                assert.equal(doc2.mainSkill.attack.good, true);
                c.database.destroy();
            });
        });
    });
    describe('issues', () => {
        it('#66 - insert -> remove -> upsert does not give new state', async () => {
            const c = await humansCollection.createPrimary(0);
            const docData = schemaObjects.simpleHuman();
            const primary = docData.passportId;


            // insert
            await c.insert(docData);
            const doc1 = await c.findOne(primary).exec();
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
        it('#66 - insert -> remove -> insert does not give new state', async () => {
            const c = await humansCollection.createPrimary(0);
            const docData = schemaObjects.simpleHuman();
            const primary = docData.passportId;

            // insert
            await c.upsert(docData);
            const doc1 = await c.findOne(primary).exec();
            assert.equal(doc1.firstName, docData.firstName);

            // remove
            await doc1.remove();

            // upsert
            docData.firstName = 'foobar';
            await c.insert(docData);
            const doc2 = await c.findOne(primary).exec();
            assert.equal(doc2.firstName, 'foobar');

            c.database.destroy();
        });
        it('#76 - deepEqual does not work correctly for Arrays', async () => {
            const db = await RxDatabase.create({
                name: util.randomCouchString(10),
                adapter: 'memory'
            });
            const col = await await db.collection({
                name: 'heroes',
                schema: schemas.simpleArrayHero
            });
            const docData = {
                name: 'foobar',
                skills: [
                    'skill1',
                    'skill2',
                    'skill3'
                ]
            };
            await col.insert(docData);
            const doc = await col.findOne().exec();
            assert.equal(doc.skills.length, 3);

            const newSkill = 'newSikSkill';
            doc.set('skills', doc.skills.concat(newSkill));
            await doc.save();

            const colDump = await col.dump(true);
            const afterSkills = colDump.docs[0].skills;
            assert.equal(afterSkills.length, 4);
            assert.ok(afterSkills.includes(newSkill));
            db.destroy();
        });
        it('#646 Skip defining getter and setter when property not defined in schema', async () => {
            const db = await RxDatabase.create({
                name: util.randomCouchString(10),
                adapter: 'memory'
            });
            const schema = {
                version: 0,
                type: 'object',
                properties: {
                    key: {
                        type: 'string',
                        primary: true
                    },
                    value: {
                        type: 'object'
                    }
                }
            };
            const col = await await db.collection({
                name: 'heroes',
                schema
            });

            const doc = await col.insert({
                key: 'foobar',
                value: {
                    x: {
                        foo: 'bar'
                    }
                }
            });

            const value = doc.get('value.x');
            assert.equal(value.foo, 'bar');

            db.destroy();
        });
        it('#734 Invalid value persists in document after failed update', async () => {
            // create a schema
            const schemaEnum = ['A', 'B'];
            const mySchema = {
                version: 0,
                type: 'object',
                properties: {
                    children: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                name: { type: 'string' },
                                abLetter: {
                                    type: 'string',
                                    enum: schemaEnum,
                                },
                            }
                        }
                    }
                }
            };

            // generate a random database-name
            const name = util.randomCouchString(10);

            // create a database
            const db = await RxDB.create({
                name,
                adapter: 'memory',
                ignoreDuplicate: true
            });
            // create a collection
            const collection = await db.collection({
                name: util.randomCouchString(10),
                schema: mySchema
            });

            // insert a document
            const doc = await collection.insert({
                children: [
                    {
                        name: 'foo',
                        abLetter: 'A'
                    },
                    {
                        name: 'bar',
                        abLetter: 'B'
                    },
                ],
            });

            const colDoc = await collection.findOne({ _id: doc._id }).exec();


            try {
                await colDoc.update({
                    $set: {
                        'children.1.abLetter': 'invalidEnumValue',
                    },
                });
            } catch (err) {
            }

            assert.equal(colDoc.children[1].abLetter, 'B');


            // clean up afterwards
            db.destroy();
        });
    });
});
