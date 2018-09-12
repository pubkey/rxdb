import assert from 'assert';
import config from './config';
import AsyncTestUtil from 'async-test-util';

import * as humansCollection from './../helper/humans-collection';
import * as schemaObjects from '../helper/schema-objects';
import * as schemas from '../helper/schemas';
import * as util from '../../dist/lib/util';

import * as RxDB from '../../dist/lib/index';
import * as RxDatabase from '../../dist/lib/index';
import * as RxCollection from '../../dist/lib/rx-collection';
import * as RxSchema from '../../dist/lib/rx-schema';

config.parallel('rx-document.test.js', () => {
    describe('statics', () => {});
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

                const proto = RxCollection.getDocumentOrmPrototype(col);
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
        describe('negative', () => {});
    });
    describe('.set()', () => {
        describe('negative', () => {
            it('should only not work on non-temporary document', async () => {
                const c = await humansCollection.createNested(5);
                const doc = await c.findOne().exec();
                const path = {
                    foo: 'bar'
                };
                await AsyncTestUtil.assertThrows(
                    () => doc.set(path, 'foo'),
                    'RxTypeError',
                    'temporary RxDocuments'
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
                await doc.atomicUpdate(docData => {
                    docData.age++;
                    return docData;
                });
                await doc.atomicUpdate(docData => {
                    docData.age++;
                    return docData;
                });
                await doc.atomicUpdate(docData => {
                    docData.age = 100;
                    return docData;
                });
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

                await first.atomicSet('firstName', 'foobar');

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
                    'RxError',
                    'already'
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
                    'RxError',
                    'schema'
                );
                db.destroy();
            });
            it('should throw when final field is modified', async () => {
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
                const docData = schemaObjects.human();
                docData.age = 1;
                const doc = await col.insert(docData);
                await AsyncTestUtil.assertThrows(
                    () => doc.update({
                        $inc: {
                            age: 1
                        }
                    }),
                    'RxError',
                    'final'
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
                    return innerDoc;
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
                    return innerDoc;
                });
                await doc.atomicUpdate((innerDoc) => {
                    innerDoc.firstName = 'foobar2';
                    return innerDoc;
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
                        return innerDoc;
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
                        return innerDoc;
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
                    return innerDoc;
                });
                await doc.atomicUpdate((innerDoc) => {
                    innerDoc.firstName = 'foobar2';
                    return innerDoc;
                });
                await AsyncTestUtil.wait(50);
                await doc.atomicUpdate((innerDoc) => {
                    innerDoc.firstName = 'foobar3';
                    return innerDoc;
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
                await doc.atomicUpdate(innerDoc => {
                    innerDoc.firstName = 'foobar';
                    return innerDoc;
                });
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
                    innerDoc.age = 50;
                    return innerDoc;
                });
                assert.equal(doc.age, 50);
                await AsyncTestUtil.assertThrows(
                    () => doc.atomicUpdate(innerDoc => {
                        innerDoc.age = 'foobar';
                        return innerDoc;
                    }),
                    'RxError',
                    'schema'
                );
                c.database.destroy();
            });
            it('should throw when final field is modified', async () => {
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
                const docData = schemaObjects.human();
                docData.age = 1;
                const doc = await col.insert(docData);

                await AsyncTestUtil.assertThrows(
                    () => doc.atomicUpdate(docData => {
                        docData.age = 100;
                        return docData;
                    }),
                    'RxError',
                    'final'
                );
                db.destroy();
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

                await doc.atomicSet('firstName', 'foobar');

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

                await doc.atomicSet('mainSkill.level', 10);
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
                await doc.atomicSet('mainSkill.attack.good', true);
                await util.promiseWait(5);
                assert.equal(value, true);
                c.database.destroy();
            });
        });
        describe('set', () => {
            it('should not work on non-temporary document', async () => {
                const c = await humansCollection.createPrimary(1);
                const doc = await c.findOne().exec();
                assert.throws(
                    () => doc.firstName = 'foobar'
                );
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
            await doc.atomicSet('skills', doc.skills.concat(newSkill));

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
                                name: {
                                    type: 'string'
                                },
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
            const child1 = {
                name: 'foo',
                abLetter: 'A'
            };
            const child2 = {
                name: 'bar',
                abLetter: 'B'
            };
            const doc = await collection.insert({
                children: [
                    child1,
                    child2
                ],
            });

            const colDoc = await collection.findOne({
                _id: doc._id
            }).exec();


            try {
                await colDoc.update({
                    $set: {
                        'children.1.abLetter': 'invalidEnumValue',
                    },
                });
            } catch (err) {}

            assert.equal(colDoc.children[1].abLetter, 'B');


            // clean up afterwards
            db.destroy();
        });
    });
});
