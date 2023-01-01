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
    RxDocumentData,
    RxStorageInstance,
    BulkWriteRow
} from '../../';

import { wrappedValidateZSchemaStorage } from '../../plugins/validate-z-schema';
import { wrappedValidateAjvStorage } from '../../plugins/validate-ajv';
// import { wrappedValidateIsMyJsonValidStorage } from '../../plugins/validate-is-my-json-valid';
import { EXAMPLE_REVISION_1 } from '../helper/revisions';

const validationImplementations: {
    key: string;
    implementation: ReturnType<typeof wrappedValidateStorageFactory>;
}[] = [
        /*
             * TODO is-my-json-valid is no longer supported, until this is fixed:
             * @link https://github.com/mafintosh/is-my-json-valid/pull/192
            {
                key: 'is-my-json-valid',
                implementation: wrappedValidateIsMyJsonValidStorage
            },
            */
        {
            key: 'ajv',
            implementation: wrappedValidateAjvStorage
        },
        {
            key: 'z-schema',
            implementation: wrappedValidateZSchemaStorage
        }
    ];



validationImplementations.forEach(
    validationImplementation => config.parallel('validate.test.js (' + validationImplementation.key + ') ', () => {
        const testContext = 'validate' + validationImplementation.key;
        async function assertBulkWriteNoError<RxDocType>(
            instance: RxStorageInstance<RxDocType, any, any>,
            writeRows: BulkWriteRow<RxDocType>[],
        ) {
            const result = await instance.bulkWrite(writeRows, testContext);
            assert.deepStrictEqual(result.error, {});
        }
        async function assertBulkWriteValidationError<RxDocType>(
            instance: RxStorageInstance<RxDocType, any, any>,
            writeRows: BulkWriteRow<RxDocType>[],
            errorMustContain?: string
        ) {
            const result = await instance.bulkWrite(writeRows, testContext);
            assert.deepStrictEqual(result.success, {});
            const errors = Object.values(result.error);
            errors.forEach(err => {
                assert.strictEqual(err.status, 422);
                if (errorMustContain) {
                    if (!JSON.stringify(err).includes(errorMustContain)) {
                        throw new Error(
                            'error does not include errorMustContain: ' +
                            errorMustContain +
                            ' data: ' + JSON.stringify(err)
                        );
                    }
                }
            });
        }

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
                it('validate with decimal _meta.lwt times', async () => {
                    const instance = await getRxStorageInstance(schemas.nestedHuman);
                    const amount = config.isFastMode() ? 10 : 155;
                    const writeRows = new Array(amount)
                        .fill(0)
                        .map(() => schemaObjects.nestedHuman())
                        .map(obj => toRxDocumentData(obj))
                        .map(document => ({ document }));

                    try {
                        await instance.bulkWrite(writeRows, testContext);
                    } catch (err) {
                        console.dir('errored:');
                        console.dir(err);
                        throw err;
                    }
                    await instance.close();
                });

                it('should allow this complex regex pattern', async () => {
                    const schema: RxJsonSchema<{ id: string; }> = {
                        version: 0,
                        primaryKey: 'id',
                        required: ['id'],
                        type: 'object',
                        properties: {
                            id: {
                                type: 'string',
                                maxLength: 40,
                                pattern: '^[a-zA-ZöäüÖÄÜß_: 0-9\\-\\.]{3,40}$',
                            }
                        }
                    };
                    const instance = await getRxStorageInstance(schema);

                    // valid
                    await assertBulkWriteNoError(
                        instance,
                        [{
                            document: toRxDocumentData({
                                id: 'abcdö-ä:ü2'
                            } as any)
                        }]
                    );

                    // non valid
                    await assertBulkWriteValidationError(
                        instance,
                        [{
                            document: toRxDocumentData({
                                id: 'a'
                            } as any)
                        }]
                    );
                    await instance.close();
                });
                it('should work with a schema as nested additionalProperties', async () => {
                    const jsonSchema: any = clone(schemas.heroArray);
                    jsonSchema.properties.skills.items['additionalProperties'] = { type: 'number' };
                    const instance = await getRxStorageInstance(jsonSchema);

                    // valid
                    await assertBulkWriteNoError(
                        instance,
                        [{
                            document: toRxDocumentData({
                                name: 'foobar',
                                skills: [
                                    {
                                        name: 'foo',
                                        damage: 10,
                                        nonDefinedField: 42
                                    }
                                ],
                            })
                        }]
                    );

                    // non valid
                    await assertBulkWriteValidationError(
                        instance,
                        [{
                            document: toRxDocumentData({
                                name: 'foobar',
                                skills: [
                                    {
                                        name: 'foo',
                                        damage: 10,
                                        nonDefinedField: 'foobar'
                                    }
                                ],
                            })
                        }]
                    );
                    await instance.close();
                });
            });
            describe('negative', () => {
                it('not validate other object', async () => {
                    const instance = await getRxStorageInstance(schemas.human);
                    await assertBulkWriteValidationError(
                        instance,
                        [{
                            document: toRxDocumentData({
                                foo: 'bar'
                            } as any)
                        }]
                    );
                    await instance.close();
                });
                it('required field not given', async () => {
                    const instance = await getRxStorageInstance(schemas.human);
                    const obj: any = schemaObjects.human();
                    delete obj.lastName;

                    await assertBulkWriteValidationError(
                        instance,
                        [{
                            document: toRxDocumentData(obj)
                        }],
                        'required'
                    );
                    await instance.close();
                });
                it('overflow maximum int', async () => {
                    const instance = await getRxStorageInstance(schemas.human);
                    const obj: any = schemaObjects.human();
                    obj.age = 1000;

                    await assertBulkWriteValidationError(
                        instance,
                        [{
                            document: toRxDocumentData(obj)
                        }],
                        'maximum'
                    );
                    await instance.close();
                });
                it('additional property', async () => {
                    const instance = await getRxStorageInstance(schemas.human);
                    const obj: any = schemaObjects.human();
                    obj['token'] = randomCouchString(5);
                    await assertBulkWriteValidationError(
                        instance,
                        [{
                            document: toRxDocumentData(obj)
                        }],
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

                    await assertBulkWriteValidationError(
                        instance,
                        [{
                            document: toRxDocumentData(obj)
                        }],
                        'dditional properties'
                    );
                    await instance.close();
                });
                it('do not allow primary==null', async () => {
                    const instance = await getRxStorageInstance(schemas.primaryHuman);
                    const obj: any = schemaObjects.simpleHuman();
                    obj.passportId = null;
                    await assertBulkWriteValidationError(
                        instance,
                        [{
                            document: toRxDocumentData(obj)
                        }],
                        'passportId'
                    );
                    await instance.close();
                });
                it('should throw if enum does not match', async () => {
                    const schema: RxJsonSchema<{ id: string; childProperty: 'A' | 'B' | 'C'; }> = {
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
                    await assertBulkWriteNoError(
                        instance,
                        [{
                            document: toRxDocumentData({
                                id: randomCouchString(12),
                                childProperty: 'A' as any
                            })
                        }]
                    );

                    // this must not work
                    await assertBulkWriteValidationError(
                        instance,
                        [{
                            document: toRxDocumentData({
                                id: randomCouchString(12),
                                childProperty: 'Z'
                            } as any)
                        }],
                        'enum'
                    );
                    await instance.close();
                });
            });
            describe('error layout', () => {
                it('accessible error-parameters', async () => {
                    const instance = await getRxStorageInstance(schemas.human);
                    const obj = schemaObjects.human('foobar');
                    (obj as any)['foobar'] = 'barfoo';

                    const result = await instance.bulkWrite([{
                        document: toRxDocumentData(obj)
                    }], testContext);
                    const err = result.error['foobar'];
                    const message = (err as any).validationErrors[0].message;
                    assert.ok(message.includes('dditional'));
                    await instance.close();
                });
                it('final fields should be required', async () => {
                    const instance = await getRxStorageInstance(schemas.humanFinal);
                    const obj = {
                        passportId: 'foobar',
                        firstName: 'foo',
                        lastName: 'bar'
                    };

                    const result = await instance.bulkWrite([{
                        document: toRxDocumentData(obj) as any
                    }], testContext);
                    const err = result.error['foobar'];
                    const deepParam = (err as any).validationErrors[0];
                    assert.ok(
                        JSON.stringify(deepParam).includes('age')
                    );
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
                        'dditional properti'
                    );
                    await db.destroy();
                });
            });
            describe('RxDocument.incrementalModify()', () => {
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
                    let doc = await collection.insert(schemaObjects.human());
                    doc = await doc.incrementalModify((innerDoc: any) => {
                        innerDoc.age = 50;
                        return innerDoc;
                    });
                    assert.strictEqual(doc.age, 50);
                    await assertThrows(
                        () => doc.incrementalModify((innerDoc: any) => {
                            innerDoc.age = 'foobar';
                            return innerDoc;
                        }),
                        'RxError',
                        'schema'
                    );
                    db.destroy();
                });
            });
            describe('RxCollection().incrementalUpsert()', () => {
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
                            collection.incrementalUpsert(docData),
                            collection.incrementalUpsert(docData),
                            collection.incrementalUpsert(docData)
                        ]);
                        const docData2 = clone(docData);
                        docData2['firstName'] = 1337 as any;
                        await assertThrows(
                            () => collection.incrementalUpsert(docData2),
                            'RxError',
                            'schema'
                        );
                        db.destroy();
                    });
                });
            });
            describe('RxDocument.incrementalPatch()', () => {
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
                        () => doc.incrementalPatch({
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
                const mySchema: RxJsonSchema<{ id: string; children: any[]; }> = {
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







