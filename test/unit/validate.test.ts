import assert from 'assert';
import {
    assertThrows,
    clone
} from 'async-test-util';

import config from './config';
import * as schemas from '../helper/schemas';
import * as schemaObjects from '../helper/schema-objects';
import {
    createRxDatabase,
    randomCouchString,
    wrappedValidateStorageFactory,
    RxJsonSchema,
    fillWithDefaultSettings,
    now,
    RxDocumentData
} from '../../';

import { wrappedValidateZSchemaStorage } from '../../plugins/validate-z-schema';
import { wrappedValidateAjvStorage } from '../../plugins/validate-ajv';
import { wrappedValidateIsMyJsonValidStorage } from '../../plugins/validate-is-my-json-valid';
import { EXAMPLE_REVISION_1 } from '../helper/revisions';

const validationImplementations: {
    key: string,
    implementation: ReturnType<typeof wrappedValidateStorageFactory>
}[] = [
        {
            key: 'is-my-json-valid',
            implementation: wrappedValidateIsMyJsonValidStorage
        },
        {
            key: 'z-schema',
            implementation: wrappedValidateZSchemaStorage
        },
        {
            key: 'ajv',
            implementation: wrappedValidateAjvStorage
        }
    ];

validationImplementations.forEach(
    validationImplementation => config.parallel('validate.test.js (' + validationImplementation.key + ') ', () => {
        const testContext = 'validate' + validationImplementation.key;
        const storage = validationImplementation.implementation({
            storage: config.storage.getStorage()
        });
        describe('RxStorageInstance', () => {
            function getRxStorageInstance<RxDocType>(schema: RxJsonSchema<RxDocType>) {
                return storage.createStorageInstance<RxDocType>({
                    collectionName: randomCouchString(10),
                    databaseInstanceToken: randomCouchString(10),
                    databaseName: randomCouchString(10),
                    multiInstance: false,
                    options: {},
                    schema: fillWithDefaultSettings(schema)
                });
            }
            function toRxDocumentData<RxDocType>(docData: RxDocType): RxDocumentData<RxDocType> {
                return Object.assign(
                    {},
                    docData,
                    {
                        _meta: {
                            lwt: now()
                        },
                        _rev: EXAMPLE_REVISION_1,
                        _attachments: {},
                        _deleted: false
                    }
                );
            }
            describe('positive', () => {
                it('validate one human', async () => {
                    const instance = await getRxStorageInstance(schemas.human);
                    await instance.bulkWrite([{
                        document: toRxDocumentData(schemaObjects.human())
                    }], testContext);
                    await instance.close();
                });

                it('validate one point', async () => {
                    const instance = await getRxStorageInstance(schemas.point);
                    await instance.bulkWrite([{
                        document: toRxDocumentData(schemaObjects.point())
                    }], testContext);
                    await instance.close();
                });
                it('validate without non-required', async () => {
                    const instance = await getRxStorageInstance(schemas.human);
                    const obj: any = schemaObjects.human();
                    delete obj.age;

                    await instance.bulkWrite([{
                        document: toRxDocumentData(obj)
                    }], testContext);
                    await instance.close();
                });
                it('validate nested', async () => {
                    const instance = await getRxStorageInstance(schemas.nestedHuman);
                    const obj: any = schemaObjects.nestedHuman();
                    await instance.bulkWrite([{
                        document: toRxDocumentData(obj)
                    }], testContext);
                    await instance.close();
                });
            });
            describe('negative', () => {
                it('not validate other object', async () => {
                    const instance = await getRxStorageInstance(schemas.human);
                    await assertThrows(
                        () => instance.bulkWrite([{
                            document: toRxDocumentData({
                                foo: 'bar'
                            } as any)
                        }], testContext),
                        'RxError',
                        'VD2'
                    );
                    await instance.close();
                });
                it('required field not given', async () => {
                    const instance = await getRxStorageInstance(schemas.human);
                    const obj: any = schemaObjects.human();
                    delete obj.lastName;

                    await assertThrows(
                        () => instance.bulkWrite([{
                            document: toRxDocumentData(obj)
                        }], testContext),
                        'RxError',
                        'required'
                    );
                    await instance.close();
                });
                it('overflow maximum int', async () => {
                    const instance = await getRxStorageInstance(schemas.human);
                    const obj: any = schemaObjects.human();
                    obj.age = 1000;

                    await assertThrows(
                        () => instance.bulkWrite([{
                            document: toRxDocumentData(obj)
                        }], testContext),
                        'RxError',
                        'maximum'
                    );
                    await instance.close();
                });
                it('additional property', async () => {
                    const instance = await getRxStorageInstance(schemas.human);
                    const obj: any = schemaObjects.human();
                    obj['token'] = randomCouchString(5);

                    await assertThrows(
                        () => instance.bulkWrite([{
                            document: toRxDocumentData(obj)
                        }], testContext),
                        'RxError',
                        'dditional properties'
                    );
                    await instance.close();
                });
                it('should respect nested additionalProperties: false', async () => {
                    const jsonSchema: any = clone(schemas.heroArray);
                    jsonSchema.properties.skills.items['additionalProperties'] = false;
                    const instance = await getRxStorageInstance(jsonSchema);
                    const obj = {
                        name: 'foobar',
                        skills: [
                            {
                                name: 'foo',
                                damage: 10,
                                nonDefinedField: 'foobar'
                            }
                        ],
                    };
                    await assertThrows(
                        () => instance.bulkWrite([{
                            document: toRxDocumentData(obj)
                        }], testContext),
                        'RxError',
                        'dditional properties'
                    );
                    await instance.close();
                });
                it('do not allow primary==null', async () => {
                    const instance = await getRxStorageInstance(schemas.primaryHuman);
                    const obj: any = schemaObjects.simpleHuman();
                    obj.passportId = null;
                    await assertThrows(
                        () => instance.bulkWrite([{
                            document: toRxDocumentData(obj)
                        }], testContext),
                        'RxError',
                        'not match'
                    );
                    await instance.close();
                });
                it('should throw if enum does not match', async () => {
                    const schema: RxJsonSchema<{ id: string; childProperty: 'A' | 'B' | 'C' }> = {
                        version: 0,
                        primaryKey: 'id',
                        type: 'object',
                        properties: {
                            id: {
                                type: 'string',
                                maxLength: 100
                            },
                            childProperty: {
                                type: 'string',
                                enum: ['A', 'B', 'C']
                            }
                        }
                    };
                    const instance = await getRxStorageInstance(schema);

                    // this must work
                    await instance.bulkWrite([{
                        document: toRxDocumentData({
                            id: randomCouchString(12),
                            childProperty: 'A'
                        })
                    }], testContext);

                    // this must not work
                    await assertThrows(
                        () => instance.bulkWrite([{
                            document: toRxDocumentData({
                                id: randomCouchString(12),
                                childProperty: 'Z'
                            } as any)
                        }], testContext),
                        'RxError',
                        'enum'
                    );

                    await instance.close();
                });
            });
            describe('error layout', () => {
                it('accessible error-parameters', async () => {
                    const instance = await getRxStorageInstance(schemas.human);
                    const obj = schemaObjects.human();
                    (obj as any)['foobar'] = 'barfoo';
                    let hasThrown = false;
                    try {
                        await instance.bulkWrite([{
                            document: toRxDocumentData(obj)
                        }], testContext);
                    } catch (err) {
                        const message = (err as any).parameters.errors[0].message;
                        assert.ok(message.includes('dditional'));
                        hasThrown = true;
                    }
                    assert.ok(hasThrown);
                    await instance.close();
                });
                it('final fields should be required', async () => {
                    const instance = await getRxStorageInstance(schemas.humanFinal);
                    let hasThrown = false;
                    const obj = {
                        passportId: 'foobar',
                        firstName: 'foo',
                        lastName: 'bar'
                    };
                    try {
                        await instance.bulkWrite([{
                            document: toRxDocumentData(obj)
                        }], testContext);
                    } catch (err) {
                        const deepParam = (err as any).parameters.errors[0];
                        assert.ok(
                            JSON.stringify(deepParam).includes('age')
                        );
                        hasThrown = true;
                    }
                    assert.ok(hasThrown);
                    await instance.close();
                });
            });
        });
        describe('RxDatabase', () => {
            describe('RxCollection().insert()', () => {
                it('should not insert broken human (required missing)', async () => {
                    const db = await createRxDatabase({
                        name: randomCouchString(10),
                        storage
                    });
                    const collections = await db.addCollections({
                        human: {
                            schema: schemas.human
                        }
                    });
                    const human: any = schemaObjects.human();
                    delete human.firstName;
                    await assertThrows(
                        () => collections.human.insert(human),
                        'RxError',
                        'not match schema'
                    );
                    db.destroy();
                });
                it('should get no event on non-succes-insert', async () => {
                    const db = await createRxDatabase({
                        name: randomCouchString(10),
                        storage
                    });
                    const cols = await db.addCollections({
                        foobar: {
                            schema: schemas.human
                        }
                    });
                    const c = cols.foobar;

                    let calls = 0;
                    const sub = db.$.subscribe(() => {
                        calls++;
                    });
                    await assertThrows(
                        () => c.insert({
                            foo: 'baar'
                        }),
                        'RxError',
                        'schema'
                    );
                    assert.strictEqual(calls, 0);
                    sub.unsubscribe();
                    db.destroy();
                });
                it('should not insert human with additional prop', async () => {
                    const db = await createRxDatabase({
                        name: randomCouchString(10),
                        storage
                    });
                    const collections = await db.addCollections({
                        human: {
                            schema: schemas.human
                        }
                    });
                    const human: any = schemaObjects.human();
                    human['any'] = randomCouchString(20);
                    await assertThrows(
                        () => collections.human.insert(human),
                        'RxError',
                        'not match schema'
                    );
                    db.destroy();
                });
                it('should not insert when primary is missing', async () => {
                    const db = await createRxDatabase({
                        name: randomCouchString(10),
                        storage
                    });
                    const collections = await db.addCollections({
                        human: {
                            schema: schemas.primaryHuman
                        }
                    });
                    await assertThrows(
                        () => collections.human.insert({
                            firstName: 'foo',
                            lastName: 'bar',
                            age: 20
                        }),
                        'RxError',
                        'required'
                    );
                    db.destroy();
                });
            });
            describe('RxCollection().upsert()', () => {
                it('throw when schema not matching', async () => {
                    const db = await createRxDatabase({
                        name: randomCouchString(10),
                        storage
                    });
                    const collections = await db.addCollections({
                        human: {
                            schema: schemas.primaryHuman
                        }
                    });
                    const collection = collections.human;
                    const obj: any = schemaObjects.simpleHuman();
                    obj.firstName = 'foobar';
                    obj['foo'] = 'bar';
                    await assertThrows(
                        () => collection.upsert(obj),
                        'RxError',
                        'not match'
                    );
                    await db.destroy();
                });
            });
            describe('RxCollection().atomicUpsert()', () => {
                describe('negative', () => {
                    it('should throw when not matching schema', async () => {
                        const db = await createRxDatabase({
                            name: randomCouchString(10),
                            storage
                        });
                        const collections = await db.addCollections({
                            human: {
                                schema: schemas.primaryHuman
                            }
                        });
                        const collection = collections.human;
                        const docData = schemaObjects.simpleHuman();
                        await Promise.all([
                            collection.atomicUpsert(docData),
                            collection.atomicUpsert(docData),
                            collection.atomicUpsert(docData)
                        ]);
                        const docData2 = clone(docData);
                        docData2['firstName'] = 1337 as any;
                        await assertThrows(
                            () => collection.atomicUpsert(docData2),
                            'RxError',
                            'schema'
                        );
                        db.destroy();
                    });
                });
            });
            describe('RxDocument.atomicUpdate()', () => {
                it('should throw when not matching schema', async () => {
                    const db = await createRxDatabase({
                        name: randomCouchString(10),
                        storage
                    });
                    const collections = await db.addCollections({
                        human: {
                            schema: schemas.human
                        }
                    });
                    const collection = collections.human;
                    const doc = await collection.insert(schemaObjects.human());
                    await doc.atomicUpdate((innerDoc: any) => {
                        innerDoc.age = 50;
                        return innerDoc;
                    });
                    assert.strictEqual(doc.age, 50);
                    await assertThrows(
                        () => doc.atomicUpdate((innerDoc: any) => {
                            innerDoc.age = 'foobar';
                            return innerDoc;
                        }),
                        'RxError',
                        'schema'
                    );
                    db.destroy();
                });
            });
            describe('RxDocument.atomicPatch()', () => {
                it('should crash on non document field', async () => {
                    const db = await createRxDatabase({
                        name: randomCouchString(10),
                        storage
                    });
                    const collections = await db.addCollections({
                        human: {
                            schema: schemas.nestedHuman
                        }
                    });
                    const collection = collections.human;
                    const doc = await collection.insert(schemaObjects.nestedHuman());
                    await assertThrows(
                        () => doc.atomicPatch({
                            foobar: 'foobar'
                        } as any),
                        'RxError'
                    );
                    db.destroy();
                });
            });
            describe('RxCollection() hooks', () => {
                it('should throw if preInsert hook invalidates the schema', async () => {
                    const db = await createRxDatabase({
                        name: randomCouchString(10),
                        storage
                    });
                    const collections = await db.addCollections({
                        human: {
                            schema: schemas.human
                        }
                    });
                    const collection = collections.human;
                    const human = schemaObjects.human();

                    collection.preInsert(function (doc: any) {
                        doc.lastName = 1337;
                    }, false);

                    await assertThrows(
                        () => collection.insert(human),
                        'RxError',
                        'not match'
                    );
                    db.destroy();
                });
            });
        });
        describe('issues', () => {
            it('#734 Invalid value persists in document after failed update', async () => {
                // create a schema
                const schemaEnum = ['A', 'B'];
                const mySchema: RxJsonSchema<{ id: string, children: any[] }> = {
                    version: 0,
                    primaryKey: 'id',
                    required: ['id'],
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            maxLength: 100
                        },
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
                const name = randomCouchString(10);

                // create a database
                const db = await createRxDatabase({
                    name,
                    storage,
                    ignoreDuplicate: true
                });
                // create a collection
                const colName = randomCouchString(10);
                const collections = await db.addCollections({
                    [colName]: {
                        schema: mySchema
                    }
                });
                const collection = collections[colName];

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
                    id: randomCouchString(12),
                    children: [
                        child1,
                        child2
                    ],
                });

                const colDoc = await collection.findOne({
                    selector: {
                        id: doc.id
                    }
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
        });
    })
);







