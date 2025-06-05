import assert from 'assert';
import AsyncTestUtil, { wait } from 'async-test-util';
import { Observable } from 'rxjs';

import config, { describeParallel } from './config.ts';
import {
    schemaObjects,
    schemas,
    humansCollection,
    isFastMode,
    isNode,
    HumanDocumentType
} from '../../plugins/test-utils/index.mjs';

import {
    createRxDatabase,
    createRxSchema,
    randomToken,
    promiseWait,
    getDocumentOrmPrototype,
    getDocumentPrototype,
    addRxPlugin,
    RxCollection,
    createBlob,
    defaultHashSha256,
    RxJsonSchema,
    BulkWriteRow,
    getWrittenDocumentsFromBulkWriteResponse
} from '../../plugins/core/index.mjs';


import { RxDBAttachmentsPlugin } from '../../plugins/attachments/index.mjs';
addRxPlugin(RxDBAttachmentsPlugin);
import { RxDBJsonDumpPlugin } from '../../plugins/json-dump/index.mjs';
import { SimpleHumanDocumentType } from '../../src/plugins/test-utils/schema-objects.ts';
addRxPlugin(RxDBJsonDumpPlugin);

import { RxDBUpdatePlugin } from '../../plugins/update/index.mjs';
addRxPlugin(RxDBUpdatePlugin);


describe('rx-document.test.js', () => {
    describeParallel('statics', () => { });
    describeParallel('prototype-merge', () => {
        describe('RxSchema.getDocumentPrototype()', () => {
            it('should get an object with all main-fields', () => {
                const schema = createRxSchema(schemas.human, defaultHashSha256);
                assert.ok(schema);
                const proto = schema.getDocumentPrototype();
                assert.ok(proto);
                const testObjData: any = schemaObjects.humanData();
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
                });
            });
        });
        describe('RxCollection.getDocumentOrmPrototype()', () => {
            it('should get a prototype with all orm-methods', async () => {
                const db = await createRxDatabase({
                    name: randomToken(10),
                    storage: config.storage.getStorage(),
                });
                const cols = await db.addCollections({
                    humans: {
                        schema: schemas.humanFinal,
                        methods: {
                            foo() {
                                return 'bar';
                            }
                        }
                    }
                });

                const proto = getDocumentOrmPrototype(cols.humans);
                const testObj: any = {};
                Object.setPrototypeOf(
                    testObj,
                    proto
                );
                assert.strictEqual(testObj['foo'](), 'bar');

                db.close();
            });
        });
        describe('RxCollection.getDocumentPrototype()', () => {
            it('should get a valid prototype', async () => {
                const db = await createRxDatabase({
                    name: randomToken(10),
                    storage: config.storage.getStorage(),
                });
                const cols = await db.addCollections({
                    humans: {
                        schema: schemas.human,
                        methods: {
                            foo() {
                                return 'bar';
                            }
                        }
                    }
                });
                const proto = getDocumentPrototype(cols.humans);

                assert.strictEqual(typeof proto.remove, 'function'); // from baseProto
                assert.strictEqual(proto.foo(), 'bar'); // from orm-proto

                db.close();
            });
        });

    });
    describeParallel('.get()', () => {
        it('get a value', async () => {
            const c = await humansCollection.create(1);
            const doc: any = await c.findOne().exec(true);
            const value = doc.get('passportId');
            assert.strictEqual(typeof value, 'string');
            c.database.close();
        });
        it('get a nested value', async () => {
            const c = await humansCollection.createNested(5);
            const doc = await c.findOne().exec(true);
            const value = doc.get('mainSkill.name');
            assert.strictEqual(typeof value, 'string');
            const value2 = doc.get('mainSkill.level');
            assert.strictEqual(typeof value2, 'number');
            c.database.close();
        });
        it('get undefined on undefined value', async () => {
            const c = await humansCollection.createNested(5);
            const doc = await c.findOne().exec(true);
            const value = doc.get('foobar');
            assert.strictEqual(value, undefined);
            c.database.close();
        });
    });
    describeParallel('.remove()', () => {
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
                c.database.close();
            });
            it('should update the data of the RxDocument instance', async () => {
                const c = await humansCollection.create(1);
                let doc = await c.findOne().exec(true);
                doc = await doc.remove();
                assert.strictEqual(doc.toJSON(true)._deleted, true);
                c.database.close();
            });
            it('should remove all revisions', async () => {
                const c = await humansCollection.create(1);
                const doc: any = await c.findOne().exec();
                assert.ok(doc);

                // update some times to generate revisions
                await doc.incrementalModify((docData: any) => {
                    docData.age++;
                    return docData;
                });
                await doc.incrementalModify((docData: any) => {
                    docData.age++;
                    return docData;
                });
                await doc.incrementalModify((docData: any) => {
                    docData.age = 100;
                    return docData;
                });
                const doc2: any = await c.findOne().exec();
                assert.strictEqual(doc2.age, 100);

                await doc2.remove();
                const doc3 = await c.findOne().exec();
                assert.strictEqual(doc3, null);

                c.database.close();
            });
            it('delete all in parallel', async () => {
                const c = await humansCollection.create(5);
                const docs = await c.find().exec();
                const fns: any[] = [];
                docs.map(doc => fns.push(doc.remove()));
                await Promise.all(fns);
                const docsAfter = await c.find().exec();
                assert.strictEqual(docsAfter.length, 0);
                c.database.close();
            });
            it('save and then remove', async () => {
                const c = await humansCollection.create(5);
                const docs = await c.find().exec();
                assert.ok(docs.length > 1);
                let first = docs[0];

                first = await first.incrementalPatch({ firstName: 'foobar' });
                await first.remove();

                const docsAfter = await c.find().exec();
                docsAfter.map(doc => {
                    if (doc._data.passportId === first._data.passportId) {
                        throw new Error('still here after remove()');
                    }
                });
                c.database.close();
            });
            it('incrementalRemove() should not create a conflict', async () => {
                const c = await humansCollection.create(1);
                const doc = await c.findOne().exec(true);
                await doc.patch({ firstName: 'first' });
                await doc.incrementalRemove();

                const docsAfter = await c.find().exec();
                assert.strictEqual(docsAfter.length, 0);

                c.database.close();
            });
            it('inserting to overwrite a deleted document should have the correct errors', async () => {
                const c = await humansCollection.create(0);
                const docData = schemaObjects.humanData('foobar');
                const doc = await c.insert(docData);
                await doc.remove();

                // insert again by using the plain wrapped storage instance
                const writeRows: BulkWriteRow<HumanDocumentType>[] = [{
                    document: {
                        passportId: 'foobar',
                        firstName: 'a',
                        lastName: 'b',
                        _rev: '',
                        age: 1,
                        _attachments: {},
                        _deleted: false,
                        _meta: {
                            lwt: 0
                        }

                    }
                }];
                const writeResult = await c.storageInstance.bulkWrite(writeRows, 'insert-deleted');
                const writeResultDocs = getWrittenDocumentsFromBulkWriteResponse(
                    c.schema.primaryPath,
                    writeRows,
                    writeResult
                );
                assert.deepStrictEqual(writeResult.error, []);
                assert.ok(writeResultDocs[0]._rev.startsWith('3-'));

                c.database.close();

            });
        });
        describe('negative', () => {
            it('should throw on conflict', async () => {
                const c = await humansCollection.create(1);
                const doc = await c.findOne().exec(true);
                await doc.remove();
                await AsyncTestUtil.assertThrows(
                    () => doc.remove(),
                    'RxError',
                    'CONFLICT'
                );
                c.database.close();
            });
            it('delete doc twice should cause a conflict', async () => {
                const c = await humansCollection.create(5);
                const doc: any = await c.findOne().exec();
                await doc.remove();
                await AsyncTestUtil.assertThrows(
                    () => doc.remove(),
                    'RxError',
                    'CONFLICT'
                );
                c.database.close();
            });
        });
    });
    describeParallel('.update()', () => {
        describe('positive', () => {
            it('$set a value with a mongo like query', async () => {
                const c = await humansCollection.createPrimary(1);
                const doc: any = await c.findOne().exec(true);
                await doc.update({
                    $set: {
                        firstName: 'new first name'
                    }
                });
                const updatedDoc = await c.findOne({
                    selector: {
                        firstName: 'new first name'
                    }
                }).exec(true);
                assert.strictEqual(updatedDoc.firstName, 'new first name');
                c.database.close();
            });
            it('$unset a value with a mongo like query', async () => {
                const c = await humansCollection.create(1);
                const doc: any = await c.findOne().exec(true);
                await doc.update({
                    $unset: {
                        age: ''
                    }
                });
                const updatedDoc: any = await c.findOne().exec(true);
                assert.strictEqual(updatedDoc.age, undefined);
                c.database.close();
            });
            it('$inc a value with a mongo like query', async () => {
                const c = await humansCollection.create(1);
                let doc = await c.findOne().exec(true);
                const agePrev = doc.age as any;
                doc = await doc.update({
                    $inc: {
                        age: 1
                    }
                });
                assert.strictEqual(doc.age, agePrev + 1);

                // check again via query
                const updatedDoc: any = await c.findOne().exec(true);
                assert.strictEqual(updatedDoc.age, agePrev + 1);
                c.database.close();
            });
            it('update and remove in one operation', async () => {
                const c = await humansCollection.create(1);
                let doc = await c.findOne().exec(true);

                doc = await doc.update({
                    $set: {
                        age: 1,
                        _deleted: true
                    }
                });

                assert.ok(doc.deleted);
                assert.strictEqual(doc.age, 1);
                const docsAfter = await c.find().exec();
                assert.strictEqual(docsAfter.length, 0);

                c.database.close();
            });
        });
        describe('negative', () => {
            it('should throw on conflict', async () => {
                const c = await humansCollection.create(1);
                const doc = await c.findOne().exec(true);

                await doc.update({
                    $set: {
                        firstName: 'first'
                    }
                });
                await AsyncTestUtil.assertThrows(
                    () => doc.update({
                        $set: {
                            firstName: 'second'
                        }
                    }),
                    'RxError',
                    'CONFLICT'
                );
                c.database.close();
            });
            it('should throw when final field is modified', async () => {
                const db = await createRxDatabase({
                    name: randomToken(10),
                    storage: config.storage.getStorage(),
                });
                const cols = await db.addCollections({
                    humans: {
                        schema: schemas.humanFinal,
                        methods: {
                            foo() {
                                return 'bar';
                            }
                        }
                    }
                });
                const docData = schemaObjects.humanData();
                docData.age = 1;
                const doc = await cols.humans.insert(docData);
                await AsyncTestUtil.assertThrows(
                    () => doc.update({
                        $inc: {
                            age: 1
                        }
                    }),
                    'RxError',
                    'final'
                );
                db.close();
            });
        });
    });
    describeParallel('.modify()', () => {
        describe('positive', () => {
            it('run one update', async () => {
                const c = await humansCollection.createNested(1);
                let doc = await c.findOne().exec(true);
                doc = await doc.incrementalModify((innerDoc: any) => {
                    innerDoc.firstName = 'foobar';
                    return innerDoc;
                });
                assert.strictEqual('foobar', doc.firstName);

                /**
                 * Running a totally new query must return the
                 * exact same document instance as incrementalModify() did.
                 */
                const doc2 = await c.findOne().exec(true);
                assert.ok(doc === doc2);

                c.database.close();
            });
            it('run two updates (last write wins)', async () => {
                const c = await humansCollection.createNested(1);
                let doc = await c.findOne().exec(true);

                doc.incrementalModify((innerDoc: any) => {
                    innerDoc.firstName = 'foobar';
                    return innerDoc;
                });
                await doc.incrementalModify((innerDoc: any) => {
                    innerDoc.firstName = 'foobar2';
                    return innerDoc;
                });

                doc = await c.findOne().exec(true);
                assert.strictEqual('foobar2', doc.firstName);
                c.database.close();
            });
            it('do many updates (last write wins)', async () => {
                const c = await humansCollection.create(1);
                let doc: any = await c.findOne().exec(true);
                let lastPromise;
                let t = 0;
                new Array(10).fill(0)
                    .map(() => {
                        t++;
                        return t;
                    })
                    .forEach(x => lastPromise = doc.incrementalModify((innerDoc: any) => {
                        innerDoc.age = x;
                        return innerDoc;
                    }));
                await lastPromise;

                doc = await c.findOne().exec(true);
                assert.strictEqual(t, doc.age);
                c.database.close();
            });
            it('run async functions', async () => {
                const c = await humansCollection.create(1);
                let doc = await c.findOne().exec(true);
                let lastPromise;
                let t = 0;
                new Array(10).fill(0)
                    .map(() => {
                        t++;
                        return t;
                    })
                    .forEach(x => lastPromise = doc.incrementalModify(async (innerDoc: any) => {
                        await promiseWait(1);
                        innerDoc.age = x;
                        return innerDoc;
                    }));
                await lastPromise;

                doc = await c.findOne().exec(true);
                assert.strictEqual(t, doc.age);
                c.database.close();
            });
            it('should work when inserting on a slow storage', async () => {
                if (
                    !isNode
                ) {
                    return;
                }
                const db = await createRxDatabase({
                    name: randomToken(10),
                    storage: config.storage.getStorage(),
                });
                const cols = await db.addCollections({
                    humans: {
                        schema: schemas.primaryHuman
                    }
                });
                const c = cols.humans;
                await c.insert(schemaObjects.simpleHumanData());
                const doc = await c.findOne().exec();

                doc.incrementalModify((innerDoc: any) => {
                    innerDoc.firstName = 'foobar';
                    return innerDoc;
                });

                await doc.incrementalModify((innerDoc: any) => {
                    innerDoc.firstName = 'foobar2';
                    return innerDoc;
                });

                await AsyncTestUtil.wait(50);

                await doc.incrementalModify((innerDoc: any) => {
                    innerDoc.firstName = 'foobar3';
                    return innerDoc;
                });
                assert.strictEqual('foobar3', doc.getLatest().firstName);

                db.close();
            });
            it('should be persistent when re-creating the database', async () => {
                if (!config.storage.hasPersistence) {
                    return;
                }
                // use a 'slow' adapter because memory might be to fast
                const dbName = randomToken(10);
                const db = await createRxDatabase({
                    name: dbName,
                    storage: config.storage.getStorage(),
                });
                const cols = await db.addCollections({
                    humans: {
                        schema: schemas.primaryHuman
                    }
                });
                const c: RxCollection<SimpleHumanDocumentType> = cols.humans;
                await c.insert(schemaObjects.simpleHumanData());
                let doc = await c.findOne().exec(true);
                const docData = doc.toJSON();
                assert.ok(docData);
                doc = await doc.incrementalModify((innerDoc: any) => {
                    innerDoc.firstName = 'foobar';
                    return innerDoc;
                });
                assert.strictEqual(doc.firstName, 'foobar');
                await db.close();

                // same again
                const db2 = await createRxDatabase({
                    name: dbName,
                    storage: config.storage.getStorage(),
                });
                const cols2 = await db2.addCollections({
                    humans: {
                        schema: schemas.primaryHuman
                    }
                });
                const c2: RxCollection<SimpleHumanDocumentType> = cols2.humans;
                const doc2 = await c2.findOne().exec(true);
                assert.strictEqual(doc.passportId, doc2.passportId);
                const docData2 = doc2.toJSON();
                assert.ok(docData2);
                assert.strictEqual(doc2.firstName, 'foobar');
                db2.close();
            });
            it('should retry on conflict errors', async () => {
                if (
                    !config.storage.hasPersistence ||
                    !config.storage.hasMultiInstance
                ) {
                    return;
                }
                const dbName = randomToken(10);
                const db = await createRxDatabase({
                    name: dbName,
                    storage: config.storage.getStorage(),
                });

                const cols = await db.addCollections({
                    humans: {
                        schema: schemas.primaryHuman
                    }
                });
                const c = cols.humans;
                const doc = await c.insert(schemaObjects.simpleHumanData());
                const db2 = await createRxDatabase({
                    name: dbName,
                    storage: config.storage.getStorage(),
                    ignoreDuplicate: true
                });
                const cols2 = await db2.addCollections({
                    humans: {
                        schema: schemas.primaryHuman
                    }
                });
                const c2 = cols2.humans;
                const doc2 = await c2.findOne().exec(true);

                await Promise.all([
                    doc.incrementalModify((d: any) => {
                        d.firstName = 'foobar1';
                        return d;
                    }),
                    doc2.incrementalModify((d: any) => {
                        d.firstName = 'foobar2';
                        return d;
                    })
                ]);

                db.close();
                db2.close();
            });
            it('modify and remove in one operation', async () => {
                const c = await humansCollection.create(1);
                let doc = await c.findOne().exec(true);

                doc = await doc.modify(data => {
                    data.age = 1;
                    data._deleted = true;
                    return data;
                });

                assert.ok(doc.deleted);
                assert.ok(doc._data._rev.startsWith('2-'));
                const docsAfter = await c.find().exec();
                assert.strictEqual(docsAfter.length, 0);

                c.database.close();
            });
        });
        describe('negative', () => {
            it('should throw on conflict', async () => {
                const c = await humansCollection.create(1);
                const doc = await c.findOne().exec(true);

                await doc.modify(docData => {
                    docData.firstName = 'first';
                    return docData;
                });
                await AsyncTestUtil.assertThrows(
                    () => doc.modify(docData => {
                        docData.firstName = 'second';
                        return docData;
                    }),
                    'RxError',
                    'CONFLICT'
                );
                c.database.close();
            });
            it('should throw when final field is modified', async () => {
                const db = await createRxDatabase({
                    name: randomToken(10),
                    storage: config.storage.getStorage(),
                });
                const cols = await db.addCollections({
                    humans: {
                        schema: schemas.humanFinal,
                        methods: {
                            foo() {
                                return 'bar';
                            }
                        }
                    }
                });
                const col = cols.humans;
                const docData = schemaObjects.humanData();
                docData.age = 1;
                const doc = await col.insert(docData);

                await AsyncTestUtil.assertThrows(
                    () => doc.incrementalModify((data: any) => {
                        data.age = 100;
                        return data;
                    }),
                    'RxError',
                    'final'
                );
                db.close();
            });
            it('should still be usable if previous mutation function has thrown', async () => {
                const col = await humansCollection.create(1);
                let doc = await col.findOne().exec(true);

                // non-async mutation
                try {
                    await doc.incrementalModify(() => {
                        throw new Error('throws intentional A');
                    });
                } catch (err) { }

                // async mutation
                try {
                    await doc.incrementalModify(async () => {
                        await wait(10);
                        throw new Error('throws intentional B');
                    });
                } catch (err) { }

                // non throwing mutation
                doc = await doc.incrementalModify(d => {
                    d.age = 150;
                    return d;
                });

                assert.strictEqual(doc.age, 150);
                col.database.close();
            });
        });
    });
    describeParallel('.patch()', () => {
        describe('positive', () => {
            it('run one update', async () => {
                const c = await humansCollection.createNested(1);
                const doc = await c.findOne().exec(true);

                const returnedDoc = await doc.incrementalPatch({
                    firstName: 'foobar'
                });
                assert.strictEqual('foobar', returnedDoc.firstName);

                const docAfter = await c.findOne().exec(true);
                assert.ok(docAfter === returnedDoc);
                c.database.close();
            });
            it('unset optional property by assigning undefined', async () => {
                const c = await humansCollection.createNested(1);
                let doc = await c.findOne().exec(true);

                assert.ok(doc.mainSkill);

                doc = await doc.incrementalPatch({
                    mainSkill: undefined
                });

                assert.strictEqual(doc.mainSkill, undefined);
                c.database.close();
            });
        });
        describe('negative', () => {
            it('should throw on conflict', async () => {
                const c = await humansCollection.create(1);
                const doc = await c.findOne().exec(true);

                await doc.patch({
                    firstName: 'first'
                });
                await AsyncTestUtil.assertThrows(
                    () => doc.patch({
                        firstName: 'second'
                    }),
                    'RxError',
                    'CONFLICT'
                );
                c.database.close();
            });
        });
    });
    describeParallel('.toJSON()', () => {
        it('should get the documents data as json', async () => {
            const c = await humansCollection.create(1);
            const doc: any = await c.findOne().exec();
            const json = doc.toJSON(true);

            assert.ok(json.passportId);
            assert.ok(json.firstName);
            assert.ok(json._rev); // when toJSON(true), the _rev field is also returned
            c.database.close();
        });
        it('should get a fresh object each time', async () => {
            const c = await humansCollection.create(1);
            const doc = await c.findOne().exec(true);
            const json = doc.toJSON();
            const json2 = doc.toJSON();
            assert.ok(json !== json2);
            c.database.close();
        });
        it('should not return meta fields if not wanted', async () => {
            const c = await humansCollection.create(0);
            await c.insert({
                passportId: 'aatspywninca',
                firstName: 'Tester',
                lastName: 'Test',
                age: 10
            });
            const newHuman = await c.findOne('aatspywninca').exec(true);
            const jsonWithWithoutMetaFields = newHuman.toJSON();

            const metaField = Object.keys(jsonWithWithoutMetaFields).find(key => key.startsWith('_'));
            if (metaField) {
                throw new Error('should not contain meta field ' + metaField);
            }

            c.database.close();
        });
        it('should not return _attachments if not wanted', async () => {
            if (!config.storage.hasAttachments) {
                return;
            }
            const db = await createRxDatabase({
                name: randomToken(10),
                storage: config.storage.getStorage(),
                multiInstance: false,
                ignoreDuplicate: true
            });
            const schemaJson = AsyncTestUtil.clone(schemas.human);
            schemaJson.attachments = {};
            const cols = await db.addCollections({
                humans: {
                    schema: schemaJson
                }
            });
            const c = cols.humans;

            const doc = await c.insert(schemaObjects.humanData());
            await doc.putAttachment({
                id: 'sampledata',
                data: createBlob('foo bar', 'application/octet-stream'),
                type: 'application/octet-stream'
            });

            const withMeta = doc.toJSON(true);
            assert.ok(withMeta._rev);
            assert.ok(withMeta._attachments);

            const withoutMeta = doc.toJSON(false);
            assert.strictEqual(typeof withoutMeta._rev, 'undefined');
            assert.strictEqual(typeof withoutMeta._attachments, 'undefined');

            db.close();
        });
    });
    describeParallel('.toMutableJSON()', () => {
        it('should be able to mutate the output', async () => {
            const c = await humansCollection.create(1);
            const doc = await c.findOne().exec(true);
            const json = doc.toMutableJSON();
            json.firstName = 'alice';
            c.database.close();
        });
    });
    describe('incrementalModify', () => {
        it('should end up with a single storage write', async () => {
            const c = await humansCollection.create(1);
            let doc = await c.findOne().exec(true);
            doc = await doc.incrementalPatch({ age: 0 });
            const bulkWriteBefore = c.storageInstance.bulkWrite.bind(c.storageInstance);
            let count = 0;
            c.storageInstance.bulkWrite = (writes, context) => {
                count = count + 1;
                return bulkWriteBefore(writes, context);
            };


            const modifier = (d: any) => {
                d.age = d.age + 1;
                return d;
            };
            await Promise.all([
                doc.incrementalModify(modifier),
                doc.incrementalModify(modifier),
                doc.incrementalModify(modifier),
                doc.incrementalModify(modifier),
                doc.incrementalModify(modifier)
            ]);

            assert.strictEqual(count, 1);

            c.database.close();
        });
    });
    describeParallel('Proxy', () => {
        describe('get', () => {
            it('top-value', async () => {
                const c = await humansCollection.create(1);
                const doc: any = await c.findOne().exec(true);
                const passportId = doc.get('passportId');
                assert.strictEqual(doc.passportId, passportId);
                c.database.close();
            });
            it('hidden properties should not show up', async () => {
                const c = await humansCollection.create(1);
                const doc: any = await c.findOne().exec(true);
                assert.ok(!Object.keys(doc).includes('lastName_'));
                c.database.close();
            });
            it('nested-value', async () => {
                const c = await humansCollection.createNested(1);
                const doc = await c.findOne().exec(true);
                const mainSkillLevel = doc.get('mainSkill.level');
                assert.strictEqual(doc.mainSkill.level, mainSkillLevel);
                c.database.close();
            });
            it('deep-nested-value', async () => {
                const c = await humansCollection.createDeepNested(1);
                const doc = await c.findOne().exec(true);
                const value = doc.get('mainSkill.attack.count');
                assert.strictEqual(doc.mainSkill.attack.count, value);

                const value2 = doc.get('mainSkill.attack.good');
                assert.strictEqual(doc.mainSkill.attack.good, value2);
                c.database.close();
            });
            it('top-value-observable', async () => {
                const c = await humansCollection.create(1);
                const doc: any = await c.findOne().exec(true);
                const obs = doc.firstName$;
                assert.ok(obs.subscribe);

                let value = null;
                obs.subscribe((newVal: any) => {
                    value = newVal;
                });

                await doc.incrementalPatch({ firstName: 'foobar' });

                await promiseWait(5);
                assert.strictEqual(value, 'foobar');

                // resubscribe should emit again
                let value2 = null;
                obs.subscribe((newVal: any) => {
                    value2 = newVal;
                });
                await promiseWait(5);
                assert.strictEqual(value2, 'foobar');
                c.database.close();
            });
            it('nested-value-observable', async () => {
                const c = await humansCollection.createNested(1);
                const doc = await c.findOne().exec(true);
                const obs: Observable<any> = (doc.mainSkill as any).level$;
                assert.ok(obs['subscribe']);

                let value = null;
                (doc.mainSkill as any).level$.subscribe((newVal: any) => {
                    value = newVal;
                });

                await doc.incrementalPatch({
                    mainSkill: {
                        name: randomToken(5),
                        level: 10
                    }
                });
                await promiseWait(5);
                assert.strictEqual(value, 10);
                c.database.close();
            });
            it('deep-nested-value-observable', async () => {
                const c = await humansCollection.createDeepNested(1);
                const doc = await c.findOne().exec(true);
                const obs = (doc.mainSkill.attack as any).good$;
                assert.ok(obs.subscribe);

                let value = null;
                (doc.mainSkill.attack as any).good$.subscribe((newVal: any) => {
                    value = newVal;
                });
                await doc.incrementalPatch({
                    mainSkill: {
                        name: 'foobar',
                        attack: {
                            good: true,
                            count: 100
                        }

                    }
                });
                await promiseWait(5);
                assert.strictEqual(value, true);
                c.database.close();
            });
            it('null fields should not return a Proxy Object but null', async () => {
                const db = await createRxDatabase({
                    name: randomToken(10),
                    storage: config.storage.getStorage(),
                });
                const cols = await await db.addCollections({
                    heroes: {
                        schema: {
                            version: 0,
                            keyCompression: false,
                            primaryKey: 'passportId',
                            type: 'object',
                            properties: {
                                passportId: {
                                    type: 'string',
                                    maxLength: 100
                                },
                                age: {
                                    type: 'integer'
                                },
                                nullField: {
                                    type: ['string', 'null']
                                },
                                nested: {
                                    type: 'object',
                                    properties: {
                                        nullField: {
                                            type: ['string', 'null']
                                        }
                                    }
                                }
                            },
                            indexes: [],
                            required: ['passportId', 'age']
                        }
                    }
                });
                const doc = await cols.heroes.insert({
                    passportId: 'foobar',
                    age: 99,
                    nullField: null,
                    nested: {
                        nullField: null
                    }
                });

                assert.strictEqual(doc.nullField, null);
                assert.strictEqual(doc.nested.nullField, null);

                db.close();
            });
            it('true fields should not return a Proxy Object but true', async () => {
                const db = await createRxDatabase({
                    name: randomToken(10),
                    storage: config.storage.getStorage(),
                });
                const cols = await await db.addCollections({
                    heroes: {
                        schema: {
                            version: 0,
                            keyCompression: false,
                            primaryKey: 'passportId',
                            type: 'object',
                            properties: {
                                passportId: {
                                    type: 'string',
                                    maxLength: 100
                                },
                                age: {
                                    type: 'integer'
                                },
                                trueField: {
                                    type: 'boolean'
                                },
                                nested: {
                                    type: 'object',
                                    properties: {
                                        trueField: {
                                            type: 'boolean'
                                        }
                                    }
                                }
                            },
                            indexes: [],
                            required: ['passportId', 'age']
                        }
                    }
                });
                const doc = await cols.heroes.insert({
                    passportId: 'foobar',
                    age: 99,
                    trueField: true,
                    nested: {
                        trueField: true
                    }
                });

                assert.strictEqual(doc.trueField, true);
                assert.strictEqual(doc.nested.trueField, true);

                db.close();
            });
        });
    });
    describeParallel('issues', () => {
        it('#66 - insert -> remove -> upsert does not give new state', async () => {
            const c = await humansCollection.createPrimary(0);
            const docData = schemaObjects.simpleHumanData();
            const primary = docData.passportId;


            // insert
            await c.insert(docData);
            const doc1 = await c.findOne(primary).exec(true);
            assert.strictEqual(doc1.firstName, docData.firstName);

            // remove
            await doc1.remove();

            // upsert
            docData.firstName = 'foobar';
            await c.upsert(docData);
            const doc2 = await c.findOne(primary).exec(true);
            assert.strictEqual(doc2.firstName, 'foobar');

            c.database.close();
        });
        // randomly failed -> run multiple times
        new Array(isFastMode() ? 1 : 4).fill(0).forEach((_v, idx) => {
            it('#66 - insert -> remove -> insert does not give new state (#' + idx + ')', async () => {
                const c = await humansCollection.createPrimary(0);
                const docData = schemaObjects.simpleHumanData();
                const primary = docData.passportId;

                // insert
                await c.upsert(docData);
                const doc1 = await c.findOne(primary).exec(true);
                assert.strictEqual(doc1.firstName, docData.firstName);

                // remove
                await doc1.remove();

                // upsert
                docData.firstName = 'foobar';
                await c.insert(docData);
                const doc2 = await c.findOne(primary).exec(true);
                assert.strictEqual(doc2.firstName, 'foobar');

                c.database.close();
            });
        });
        it('#76 - deepEqual does not work correctly for Arrays', async () => {
            const db = await createRxDatabase({
                name: randomToken(10),
                storage: config.storage.getStorage(),
            });
            const cols = await await db.addCollections({
                heroes: {
                    schema: schemas.simpleArrayHero
                }
            });
            const col = cols.heroes;
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
            await doc.incrementalPatch({ skills: doc.skills.concat(newSkill) });

            const colDump = await col.exportJSON();
            const afterSkills = colDump.docs[0].skills;
            assert.strictEqual(afterSkills.length, 4);
            assert.ok(afterSkills.includes(newSkill));
            db.close();
        });
        it('#646 Skip defining getter and setter when property not defined in schema', async () => {
            const db = await createRxDatabase({
                name: randomToken(10),
                storage: config.storage.getStorage(),
            });
            const schema = {
                version: 0,
                primaryKey: 'key',
                type: 'object',
                properties: {
                    key: {
                        type: 'string',
                        maxLength: 100
                    },
                    value: {
                        type: 'object'
                    }
                },
                required: ['key']
            };
            const cols = await await db.addCollections({
                heroes: {
                    schema
                }
            });
            const col = cols.heroes;

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

            db.close();
        });
        it('#830 should return a rejected promise when already deleted', async () => {
            const c = await humansCollection.createPrimary(1);
            let doc = await c.findOne().exec(true);
            assert.ok(doc);
            doc = await doc.remove();
            assert.ok(doc.deleted);
            const ret = doc.remove();
            if (!ret) {
                throw new Error('missing');
            }
            assert.strictEqual(typeof ret.then, 'function'); // ensure it's a promise
            await AsyncTestUtil.assertThrows(
                () => ret,
                'RxError',
                'already deleted'
            );
            c.database.close();
        });
        it('#1325 populate should return null when value is falsy', async () => {
            const collection = await humansCollection.createRelated();
            let doc = await collection.findOne({
                selector: {
                    bestFriend: { $exists: true }
                }
            }).exec(true);
            doc = await doc.update({
                $set: {
                    bestFriend: ''
                }
            });
            const populate = await doc.populate('bestFriend');

            assert.strictEqual(populate, null);

            collection.database.close();
        });
        /**
         * @link https://github.com/pubkey/rxdb/pull/3839
         */
        it('#3839 executing insert -> remove -> insert -> remove fails', async () => {
            // create a schema
            const mySchema = {
                title: 'example schema',
                version: 0,
                description: 'describes an example collection schema',
                primaryKey: 'name',
                type: 'object',
                properties: {
                    name: {
                        $comment: 'primary key MUST have a maximum length!',
                        type: 'string',
                        maxLength: 100,
                    },
                    gender: {
                        type: 'string',
                    },
                    birthyear: {
                        type: 'integer',
                        final: true,
                        minimum: 1900,
                        maximum: 2099,
                    },
                },
                required: ['name', 'gender'],
            };

            // generate a random database-name
            const name = randomToken(10);

            // create a database
            const db = await createRxDatabase({
                name,
                /**
                 * By calling config.storage.getStorage(),
                 * we can ensure that all variations of RxStorage are tested in the CI.
                 */
                storage: config.storage.getStorage(),
                eventReduce: true,
                ignoreDuplicate: true
            });
            // create a collection
            const collections = await db.addCollections({
                mycollection: {
                    schema: mySchema
                }
            });

            // insert a document
            await collections.mycollection.insert({
                name: 'test1',
                gender: 'male',
                birthyear: 2000
            });

            // remove a document
            await collections.mycollection.findOne({
                selector: {
                    name: 'test1'
                }
            }).remove();

            // insert document again
            await collections.mycollection.insert({
                name: 'test1',
                gender: 'male',
                birthyear: 2000
            });

            // remove document again
            await collections.mycollection.findOne({
                selector: {
                    name: 'test1'
                }
            }).remove();

            // clean up afterwards
            db.close();
        });
        it('#4949 RxDocument.get() on additonalProperty', async () => {
            const mySchema: RxJsonSchema<any> = {
                version: 0,
                primaryKey: 'passportId',
                type: 'object',
                properties: {
                    passportId: {
                        type: 'string',
                        maxLength: 100
                    },
                    firstName: {
                        type: 'string'
                    },
                    lastName: {
                        type: 'string'
                    },
                    age: {
                        type: 'integer',
                        minimum: 0,
                        maximum: 150
                    },
                    tags: {
                        type: 'object',
                        additionalProperties: true,
                    },
                },
            };
            const db = await createRxDatabase({
                name: randomToken(10),
                storage: config.storage.getStorage()
            });
            const collections = await db.addCollections({
                mycollection: {
                    schema: mySchema
                }
            });
            const tags = {
                hello: {
                    created: 1,
                    name: 'hello',
                },
                world: {
                    created: 2,
                    name: 'world',
                }
            };
            const myDocument = await collections.mycollection.insert({
                passportId: 'foobar',
                firstName: 'Bob',
                lastName: 'Kelso',
                age: 56,
                tags
            });

            assert.deepStrictEqual(myDocument.toJSON().tags.hello, tags.hello, 'myDocument.toJSON().tags.hello');
            assert.deepStrictEqual(myDocument.toJSON().tags.world, tags.world, 'myDocument.toJSON().tags.world');
            assert.deepStrictEqual(Object.keys(myDocument.toJSON().tags), Object.keys(tags), 'Object.keys(myDocument.toJSON().tags)');
            assert.deepStrictEqual(JSON.stringify(myDocument.get('tags').hello), JSON.stringify(tags.hello), 'myDocument.get(\'tags\').hello');
            assert.deepStrictEqual(JSON.stringify(myDocument.get('tags').world), JSON.stringify(tags.world), 'myDocument.get(\'tags\').world');
            assert.deepStrictEqual(Object.keys(myDocument.get('tags')), Object.keys(tags), 'Object.keys(myDocument.get(\'tags\'))');

            assert.deepStrictEqual(JSON.stringify(myDocument.tags.hello), JSON.stringify(tags.hello), 'myDocument.tags.hello');
            assert.deepStrictEqual(JSON.stringify(myDocument.tags.world), JSON.stringify(tags.world), 'myDocument.tags.world');
            assert.deepStrictEqual(Object.keys(myDocument.tags), Object.keys(tags), 'Object.keys(myDocument.tags)');

            // clean up afterwards
            db.close();
        });
    });
});
