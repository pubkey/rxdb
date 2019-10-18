import assert from 'assert';
import config from './config';
import AsyncTestUtil from 'async-test-util';

import * as humansCollection from './../helper/humans-collection';
import * as schemaObjects from '../helper/schema-objects';
import * as schemas from '../helper/schemas';
import * as util from '../../dist/lib/util';

import * as RxCollection from '../../dist/lib/rx-collection';
import {
    create as createRxDatabase,
    createRxSchema
} from '../../';

import {
    getDocumentOrmPrototype,
    getDocumentPrototype
} from '../../dist/lib/rx-document-prototype-merge';



config.parallel('rx-document.test.js', () => {
    describe('statics', () => { });
    describe('prototype-merge', () => {
        describe('RxSchema.getDocumentPrototype()', () => {
            it('should get an object with all main-fields', async () => {
                const schema = createRxSchema(schemas.human);
                assert.ok(schema);
                const proto = schema.getDocumentPrototype();
                assert.ok(proto);
                const testObjData: any = schemaObjects.human();
                const testObj: any = {
                    get(path: string) {
                        return testObjData[path];
                    },
                    get$(path: string) {
                        return 'Observable:' + path;
                    },
                    populate(path: string) {
                        return 'Promise:' + path;
                    },
                    set(path: string, val: any) {
                        testObjData[path] = val;
                    }
                };
                Object.setPrototypeOf(
                    testObj,
                    proto
                );

                assert.strictEqual(testObj['passportId'], testObjData.passportId);
                Object.keys(testObjData).forEach(k => {
                    assert.strictEqual(testObj[k], testObjData[k]); // getter attribute
                    assert.strictEqual(testObj[k + '$'], 'Observable:' + k); // getter observable
                    assert.strictEqual(testObj[k + '_'], 'Promise:' + k); // getter populate
                    // test setter
                    testObj[k] = 'foo';
                    assert.strictEqual(testObjData[k], 'foo');
                });
            });
        });
        describe('RxCollection.getDocumentOrmPrototype()', () => {
            it('should get a prototype with all orm-methods', async () => {
                const db = await createRxDatabase({
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

                const proto = getDocumentOrmPrototype(col);
                const testObj: any = {};
                Object.setPrototypeOf(
                    testObj,
                    proto
                );
                assert.strictEqual(testObj['foo'](), 'bar');

                db.destroy();
            });
        });
        describe('RxCollection.getDocumentPrototype()', () => {
            it('should get a valid prototype', async () => {
                const db = await createRxDatabase({
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
                const proto = getDocumentPrototype(col);

                assert.strictEqual(typeof proto.remove, 'function'); // from baseProto
                assert.strictEqual(proto.foo(), 'bar'); // from orm-proto

                db.destroy();
            });
        });

    });
    describe('.get()', () => {
        describe('positive', () => {
            it('get a value', async () => {
                const c = await humansCollection.create(1);
                const doc: any = await c.findOne().exec();
                const value = doc.get('passportId');
                assert.strictEqual(typeof value, 'string');
                c.database.destroy();
            });
            it('get a nested value', async () => {
                const c = await humansCollection.createNested(5);
                const doc = await c.findOne().exec();
                const value = doc.get('mainSkill.name');
                assert.strictEqual(typeof value, 'string');
                const value2 = doc.get('mainSkill.level');
                assert.strictEqual(typeof value2, 'number');
                c.database.destroy();
            });
            it('get undefined on undefined value', async () => {
                const c = await humansCollection.createNested(5);
                const doc = await c.findOne().exec();
                const value = doc.get('foobar');
                assert.strictEqual(value, undefined);
                c.database.destroy();
            });
        });
        describe('negative', () => { });
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
                const doc: any = await c.findOne().exec();
                assert.ok(doc);

                // update some times to generate revisions
                await doc.atomicUpdate((docData: any) => {
                    docData.age++;
                    return docData;
                });
                await doc.atomicUpdate((docData: any) => {
                    docData.age++;
                    return docData;
                });
                await doc.atomicUpdate((docData: any) => {
                    docData.age = 100;
                    return docData;
                });
                const doc2: any = await c.findOne().exec();
                assert.strictEqual(doc2.age, 100);

                await doc2.remove();
                const doc3 = await c.findOne().exec();
                assert.strictEqual(doc3, null);

                c.database.destroy();
            });
            it('delete all in parrallel', async () => {
                const c = await humansCollection.create(5);
                const docs = await c.find().exec();
                const fns: any[] = [];
                docs.map(doc => fns.push(doc.remove()));
                await Promise.all(fns);
                const docsAfter = await c.find().exec();
                assert.strictEqual(docsAfter.length, 0);
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
                const doc: any = await c.findOne().exec();
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
                const doc: any = await c.findOne().exec();
                await doc.update({
                    $set: {
                        firstName: 'new first name'
                    }
                });
                const updatedDoc = await c.findOne({
                    firstName: 'new first name'
                }).exec();
                assert.strictEqual(updatedDoc.firstName, 'new first name');
                c.database.destroy();
            });
            it('$unset a value with a mongo like query', async () => {
                const c = await humansCollection.create(1);
                const doc: any = await c.findOne().exec();
                await doc.update({
                    $unset: {
                        age: ''
                    }
                });
                const updatedDoc: any = await c.findOne().exec();
                assert.strictEqual(updatedDoc.age, undefined);
                c.database.destroy();
            });
            it('$inc a value with a mongo like query', async () => {
                const c = await humansCollection.create(1);
                const doc: any = await c.findOne().exec();
                const agePrev = doc.age;
                await doc.update({
                    $inc: {
                        age: 1
                    }
                });
                assert.strictEqual(doc.age, agePrev + 1);
                await doc.save;
                const updatedDoc: any = await c.findOne().exec();
                assert.strictEqual(updatedDoc.age, agePrev + 1);
                c.database.destroy();
            });
        });
        describe('negative', () => {
            it('should throw if schema does not match', async () => {
                const schema = {
                    $id: '#child-def',
                    version: 0,
                    type: 'object',
                    properties: {
                        childProperty: {
                            type: 'string',
                            enum: ['A', 'B', 'C']
                        }
                    }
                };
                const db = await createRxDatabase({
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
                const db = await createRxDatabase({
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

                const returnedDoc = await doc.atomicUpdate((innerDoc: any) => {
                    innerDoc.firstName = 'foobar';
                    return innerDoc;
                });
                assert.strictEqual('foobar', doc.firstName);
                assert.ok(doc === returnedDoc);
                c.database.destroy();
            });
            it('run two updates (last write wins)', async () => {
                const c = await humansCollection.createNested(1);
                const doc = await c.findOne().exec();

                doc.atomicUpdate((innerDoc: any) => {
                    innerDoc.firstName = 'foobar';
                    return innerDoc;
                });
                await doc.atomicUpdate((innerDoc: any) => {
                    innerDoc.firstName = 'foobar2';
                    return innerDoc;
                });
                assert.strictEqual('foobar2', doc.firstName);
                c.database.destroy();
            });
            it('do many updates (last write wins)', async () => {
                const c = await humansCollection.create(1);
                const doc: any = await c.findOne().exec();
                let lastPromise;
                let t = 0;
                new Array(10).fill(0)
                    .map(() => {
                        t++;
                        return t;
                    })
                    .forEach(x => lastPromise = doc.atomicUpdate((innerDoc: any) => {
                        innerDoc.age = x;
                        return innerDoc;
                    }));
                await lastPromise;
                assert.strictEqual(t, doc.age);
                c.database.destroy();
            });
            it('run async functions', async () => {
                const c = await humansCollection.create(1);
                const doc: any = await c.findOne().exec();
                let lastPromise;
                let t = 0;
                new Array(10).fill(0)
                    .map(() => {
                        t++;
                        return t;
                    })
                    .forEach(x => lastPromise = doc.atomicUpdate(async (innerDoc: any) => {
                        await util.promiseWait(1);
                        innerDoc.age = x;
                        return innerDoc;
                    }));
                await lastPromise;
                assert.strictEqual(t, doc.age);
                c.database.destroy();
            });
            it('should work when inserting on a slow storage', async () => {
                if (!config.platform.isNode()) return;
                // use a 'slow' adapter because memory might be to fast
                const leveldown = require('leveldown');
                const db = await createRxDatabase({
                    name: config.rootPath + 'test_tmp/' + util.randomCouchString(10),
                    adapter: leveldown
                });
                const c = await db.collection({
                    name: 'humans',
                    schema: schemas.primaryHuman
                });
                await c.insert(schemaObjects.simpleHuman());
                const doc = await c.findOne().exec();
                doc.atomicUpdate((innerDoc: any) => {
                    innerDoc.firstName = 'foobar';
                    return innerDoc;
                });
                await doc.atomicUpdate((innerDoc: any) => {
                    innerDoc.firstName = 'foobar2';
                    return innerDoc;
                });
                await AsyncTestUtil.wait(50);
                await doc.atomicUpdate((innerDoc: any) => {
                    innerDoc.firstName = 'foobar3';
                    return innerDoc;
                });
                assert.strictEqual('foobar3', doc.firstName);

                db.destroy();
            });
            it('should be persistent when re-creating the database', async () => {
                if (!config.platform.isNode()) return;
                // use a 'slow' adapter because memory might be to fast
                const leveldown = require('leveldown');

                const dbName = config.rootPath + 'test_tmp/' + util.randomCouchString(10);
                const db = await createRxDatabase({
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
                await doc.atomicUpdate((innerDoc: any) => {
                    innerDoc.firstName = 'foobar';
                    return innerDoc;
                });
                assert.strictEqual(doc.firstName, 'foobar');
                await db.destroy();

                // same again
                const db2 = await createRxDatabase({
                    name: dbName,
                    adapter: leveldown
                });
                const c2 = await db2.collection({
                    name: 'humans',
                    schema: schemas.primaryHuman
                });
                const doc2 = await c2.findOne().exec();
                assert.strictEqual(doc.passportId, doc2.passportId);
                const docData2 = doc2.toJSON();
                assert.ok(docData2);
                assert.strictEqual(doc2.firstName, 'foobar');
                db2.destroy();
            });
        });
        describe('negative', () => {
            it('should throw when not matching schema', async () => {
                const c = await humansCollection.create(1);
                const doc: any = await c.findOne().exec();
                await doc.atomicUpdate((innerDoc: any) => {
                    innerDoc.age = 50;
                    return innerDoc;
                });
                assert.strictEqual(doc.age, 50);
                await AsyncTestUtil.assertThrows(
                    () => doc.atomicUpdate((innerDoc: any) => {
                        innerDoc.age = 'foobar';
                        return innerDoc;
                    }),
                    'RxError',
                    'schema'
                );
                c.database.destroy();
            });
            it('should throw when final field is modified', async () => {
                const db = await createRxDatabase({
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
                    () => doc.atomicUpdate((data: any) => {
                        data.age = 100;
                        return data;
                    }),
                    'RxError',
                    'final'
                );
                db.destroy();
            });
        });
    });
    describe('.toJSON()', () => {
        it('should get the documents data as json', async () => {
            const c = await humansCollection.create(1);
            const doc: any = await c.findOne().exec();
            const json = doc.toJSON();

            assert.ok(json.passportId);
            assert.ok(json.firstName);
            assert.ok(json._id);
            assert.ok(json._rev); // per default ._rev is also returned
            c.database.destroy();
        });
        it('should get a fresh object each time', async () => {
            const c = await humansCollection.create(1);
            const doc: any = await c.findOne().exec();
            const json = doc.toJSON();
            const json2 = doc.toJSON();
            assert.ok(json !== json2);
            c.database.destroy();
        });
        it('should not return _rev if not wanted', async () => {
            const c = await humansCollection.create(1);
            const doc: any = await c.findOne().exec();
            const json = doc.toJSON(
                false // no ._rev
            );
            assert.ok(json.passportId);
            assert.ok(json.firstName);
            assert.ok(json._id);
            assert.strictEqual(typeof json._rev, 'undefined');
            c.database.destroy();
        });
        it('should not return _attachments if not wanted', async () => {
            const db = await createRxDatabase({
                name: util.randomCouchString(10),
                adapter: 'memory',
                multiInstance: false,
                ignoreDuplicate: true
            });
            const schemaJson = AsyncTestUtil.clone(schemas.human);
            schemaJson.attachments = {};
            const c = await db.collection({
                name: 'humans',
                schema: schemaJson
            });
            const doc = await c.insert(schemaObjects.human());
            await doc.putAttachment({
                id: 'sampledata',
                data: 'foo bar',
                type: 'application/octet-stream'
            });

            const withMeta = doc.toJSON(true);
            assert.ok(withMeta._rev);
            assert.ok(withMeta._attachments);

            const withoutMeta = doc.toJSON(false);
            assert.strictEqual(typeof withoutMeta._rev, 'undefined');
            assert.strictEqual(typeof withoutMeta._attachments, 'undefined');

            db.destroy();
        });
    });
    describe('pseudo-Proxy', () => {
        describe('get', () => {
            it('top-value', async () => {
                const c = await humansCollection.create(1);
                const doc: any = await c.findOne().exec();
                const passportId = doc.get('passportId');
                assert.strictEqual(doc.passportId, passportId);
                c.database.destroy();
            });
            it('hidden properties should not show up', async () => {
                const c = await humansCollection.create(1);
                const doc: any = await c.findOne().exec();
                assert.ok(!Object.keys(doc).includes('lastName_'));
                c.database.destroy();
            });
            it('nested-value', async () => {
                const c = await humansCollection.createNested(1);
                const doc = await c.findOne().exec();
                const mainSkillLevel = doc.get('mainSkill.level');
                assert.strictEqual(doc.mainSkill.level, mainSkillLevel);
                c.database.destroy();
            });
            it('deep-nested-value', async () => {
                const c = await humansCollection.createDeepNested(1);
                const doc = await c.findOne().exec();
                const value = doc.get('mainSkill.attack.count');
                assert.strictEqual(doc.mainSkill.attack.count, value);

                const value2 = doc.get('mainSkill.attack.good');
                assert.strictEqual(doc.mainSkill.attack.good, value2);
                c.database.destroy();
            });
            it('top-value-observable', async () => {
                const c = await humansCollection.create(1);
                const doc: any = await c.findOne().exec();
                const obs = doc.firstName$;
                assert.ok(obs.subscribe);

                let value = null;
                obs.subscribe((newVal: any) => {
                    value = newVal;
                });

                await doc.atomicSet('firstName', 'foobar');

                await util.promiseWait(5);
                assert.strictEqual(value, 'foobar');

                // resubscribe should emit again
                let value2 = null;
                obs.subscribe((newVal: any) => {
                    value2 = newVal;
                });
                await util.promiseWait(5);
                assert.strictEqual(value2, 'foobar');
                c.database.destroy();
            });
            it('nested-value-observable', async () => {
                const c = await humansCollection.createNested(1);
                const doc = await c.findOne().exec();
                const obs = doc.mainSkill.level$;
                assert.ok(obs.subscribe);

                let value = null;
                doc.mainSkill.level$.subscribe((newVal: any) => {
                    value = newVal;
                });

                await doc.atomicSet('mainSkill.level', 10);
                await util.promiseWait(5);
                assert.strictEqual(value, 10);
                c.database.destroy();
            });
            it('deep-nested-value-observable', async () => {
                const c = await humansCollection.createDeepNested(1);
                const doc = await c.findOne().exec();
                const obs = doc.mainSkill.attack.good$;
                assert.ok(obs.subscribe);

                let value = null;
                doc.mainSkill.attack.good$.subscribe((newVal: any) => {
                    value = newVal;
                });
                await doc.atomicSet('mainSkill.attack.good', true);
                await util.promiseWait(5);
                assert.strictEqual(value, true);
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
            assert.strictEqual(doc1.firstName, docData.firstName);

            // remove
            await doc1.remove();

            // upsert
            docData.firstName = 'foobar';
            await c.upsert(docData);
            const doc2 = await c.findOne(primary).exec();
            assert.strictEqual(doc2.firstName, 'foobar');

            c.database.destroy();
        });
        it('#66 - insert -> remove -> insert does not give new state', async () => {
            const c = await humansCollection.createPrimary(0);
            const docData = schemaObjects.simpleHuman();
            const primary = docData.passportId;

            // insert
            await c.upsert(docData);
            const doc1 = await c.findOne(primary).exec();
            assert.strictEqual(doc1.firstName, docData.firstName);

            // remove
            await doc1.remove();

            // upsert
            docData.firstName = 'foobar';
            await c.insert(docData);
            const doc2 = await c.findOne(primary).exec();
            assert.strictEqual(doc2.firstName, 'foobar');

            c.database.destroy();
        });
        it('#76 - deepEqual does not work correctly for Arrays', async () => {
            const db = await createRxDatabase({
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
            assert.strictEqual(doc.skills.length, 3);

            const newSkill = 'newSikSkill';
            await doc.atomicSet('skills', doc.skills.concat(newSkill));

            const colDump = await col.dump(true);
            const afterSkills = colDump.docs[0].skills;
            assert.strictEqual(afterSkills.length, 4);
            assert.ok(afterSkills.includes(newSkill));
            db.destroy();
        });
        it('#646 Skip defining getter and setter when property not defined in schema', async () => {
            const db = await createRxDatabase({
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
            assert.strictEqual(value.foo, 'bar');

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
            const db = await createRxDatabase({
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
            } catch (err) { }

            assert.strictEqual(colDoc.children[1].abLetter, 'B');


            // clean up afterwards
            db.destroy();
        });
        it('#830 should return a rejected promise when already deleted', async () => {
            const c = await humansCollection.createPrimary(1);
            const doc = await c.findOne().exec();
            assert.ok(doc);
            await doc.remove();
            assert.ok(doc.deleted);
            const ret = doc.remove();
            assert.strictEqual(typeof ret.then, 'function'); // ensure it's a promise
            await AsyncTestUtil.assertThrows(
                () => ret,
                'RxError',
                'already deleted'
            );
            c.database.destroy();
        });
        it('#1325 populate should return null when value is falsy', async () => {
            const collection = await humansCollection.createRelated();
            const doc = await collection.findOne({
                bestFriend: { $exists: true }
            }).exec();

            await doc.update({
                $set: {
                    bestFriend: ''
                }
            });
            const populate = await doc.populate('bestFriend');

            assert.strictEqual(populate, null);

            collection.database.destroy();
        });
    });
});
