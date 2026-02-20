import assert from 'assert';
import {
    assertThrows,
    clone,
    deepEqual
} from 'async-test-util';

import config, { describeParallel } from './config.ts';
import {
    schemaObjects,
    schemas,
    EXAMPLE_REVISION_1,
    isFastMode
} from '../../plugins/test-utils/index.mjs';
import {
    createRxDatabase,
    randomToken,
    wrappedValidateStorageFactory,
    RxJsonSchema,
    fillWithDefaultSettings,
    now,
    RxDocumentData,
    RxStorageInstance,
    BulkWriteRow,
    RxStorage
} from '../../plugins/core/index.mjs';

import { wrappedValidateZSchemaStorage, ZSchemaClass } from '../../plugins/validate-z-schema/index.mjs';
import { wrappedValidateAjvStorage, getAjv } from '../../plugins/validate-ajv/index.mjs';
import { getRxStorageMemory } from '../../plugins/storage-memory/index.mjs';

/**
 * The is-my-json-valid seems to be dead.
 * If this ever changes, reopen this PR for fix:
 * @link https://github.com/pubkey/rxdb/pull/3935
 */
// import { wrappedValidateIsMyJsonValidStorage } from '../../plugins/validate-is-my-json-valid';


const validationImplementations: {
    key: string;
    implementation: ReturnType<typeof wrappedValidateStorageFactory>;
}[] = [
        /*
             * is-my-json-valid is no longer supported, until this is fixed:
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
    validationImplementation => describeParallel('validate.test.js (' + validationImplementation.key + ') ', () => {
        const testContext = 'validate' + validationImplementation.key;
        async function assertBulkWriteNoError<RxDocType>(
            instance: RxStorageInstance<RxDocType, any, any>,
            writeRows: BulkWriteRow<RxDocType>[],
        ) {
            const result = await instance.bulkWrite(writeRows, testContext);
            assert.deepStrictEqual(result.error, []);
        }
        async function assertBulkWriteValidationError<RxDocType>(
            instance: RxStorageInstance<RxDocType, any, any>,
            writeRows: BulkWriteRow<RxDocType>[],
            errorMustContain?: string
        ) {
            const result = await instance.bulkWrite(writeRows, testContext);
            const errors = result.error;
            assert.ok(errors[0]);
            errors.forEach(err => {
                assert.strictEqual(err.status, 422);
                // 422 validation errors must include the schema for easier debugging.
                assert.strictEqual((err as any).schema.type, 'object');
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

        let storage: RxStorage<any, any>;
        describe('init', () => {
            it('create storage', () => {
                const innerStorage: RxStorage<any, any> = config.storage.getStorage();
                storage = validationImplementation.implementation({
                    storage: innerStorage
                });
            });
        });
        describe('RxStorageInstance', () => {
            function getRxStorageInstance<RxDocType>(schema: RxJsonSchema<RxDocType>) {
                return storage.createStorageInstance<RxDocType>({
                    collectionName: randomToken(10),
                    databaseInstanceToken: randomToken(10),
                    databaseName: randomToken(10),
                    multiInstance: false,
                    options: {},
                    schema: fillWithDefaultSettings(schema),
                    devMode: true
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
                        document: toRxDocumentData(schemaObjects.humanData())
                    }], testContext);
                    await instance.close();
                });

                it('validate one point', async () => {
                    const instance = await getRxStorageInstance(schemas.point);
                    await instance.bulkWrite([{
                        document: toRxDocumentData(schemaObjects.pointData())
                    }], testContext);
                    await instance.close();
                });
                it('validate without non-required', async () => {
                    const instance = await getRxStorageInstance(schemas.human);
                    const obj: any = schemaObjects.humanData();
                    delete obj.age;

                    await instance.bulkWrite([{
                        document: toRxDocumentData(obj)
                    }], testContext);
                    await instance.close();
                });
                it('validate nested', async () => {
                    const instance = await getRxStorageInstance(schemas.nestedHuman);
                    const obj: any = schemaObjects.nestedHumanData();
                    await instance.bulkWrite([{
                        document: toRxDocumentData(obj)
                    }], testContext);
                    await instance.close();
                });
                it('validate with decimal _meta.lwt times', async () => {
                    const instance = await getRxStorageInstance(schemas.nestedHuman);
                    const amount = isFastMode() ? 10 : 100;
                    const writeRows = new Array(amount)
                        .fill(0)
                        .map(() => schemaObjects.nestedHumanData())
                        .map(obj => toRxDocumentData(obj))
                        .map(document => ({ document }));

                    try {
                        await instance.bulkWrite(writeRows, testContext);
                    } catch (err) {
                        console.dir('errored:');
                        console.dir(err);
                        throw err;
                    }
                    await instance.remove();
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
                    const obj: any = schemaObjects.humanData();
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
                    const obj: any = schemaObjects.humanData();
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
                    const obj: any = schemaObjects.humanData();
                    obj['token'] = randomToken(5);
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
                    const obj: any = schemaObjects.simpleHumanData();
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
                                id: randomToken(12),
                                childProperty: 'A' as any
                            })
                        }]
                    );

                    // this must not work
                    await assertBulkWriteValidationError(
                        instance,
                        [{
                            document: toRxDocumentData({
                                id: randomToken(12),
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
                    const obj = schemaObjects.humanData('foobar');
                    (obj as any)['foobar'] = 'barfoo';

                    const result = await instance.bulkWrite([{
                        document: toRxDocumentData(obj)
                    }], testContext);
                    const err = result.error[0];
                    const message = (err as any).validationErrors[0].message;
                    assert.ok(message.includes('dditional'));
                    await instance.close();
                });
                it('final fields should NOT be required', async () => {
                    const instance = await getRxStorageInstance(schemas.humanFinal);
                    const obj = {
                        passportId: 'foobar',
                        firstName: 'foo',
                        lastName: 'bar'
                    };

                    const result = await instance.bulkWrite([{
                        document: toRxDocumentData(obj) as any
                    }], testContext);
                    assert.deepStrictEqual(result.error, []);

                    await instance.close();
                });
            });
        });
        describe('RxDatabase', () => {
            describe('RxCollection().insert()', () => {
                it('should not insert broken human (required missing)', async () => {
                    const db = await createRxDatabase({
                        name: randomToken(10),
                        storage
                    });
                    const collections = await db.addCollections({
                        human: {
                            schema: schemas.human
                        }
                    });
                    const human: any = schemaObjects.humanData();
                    delete human.firstName;
                    await assertThrows(
                        () => collections.human.insert(human),
                        'RxError',
                        'not match schema'
                    );
                    db.close();
                });
                it('should get no event on non-success-insert', async () => {
                    const db = await createRxDatabase({
                        name: randomToken(10),
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
                    db.close();
                });
                it('should not insert human with additional prop', async () => {
                    const db = await createRxDatabase({
                        name: randomToken(10),
                        storage
                    });
                    const collections = await db.addCollections({
                        human: {
                            schema: schemas.human
                        }
                    });
                    const human: any = schemaObjects.humanData();
                    human['any'] = randomToken(20);
                    await assertThrows(
                        () => collections.human.insert(human),
                        'RxError',
                        'not match schema'
                    );
                    db.close();
                });
                it('should not insert when primary is missing', async () => {
                    const db = await createRxDatabase({
                        name: randomToken(10),
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
                    db.close();
                });
            });
            describe('RxCollection().upsert()', () => {
                it('throw when schema not matching', async () => {
                    const db = await createRxDatabase({
                        name: randomToken(10),
                        storage
                    });
                    const collections = await db.addCollections({
                        human: {
                            schema: schemas.primaryHuman
                        }
                    });
                    const collection = collections.human;
                    const obj: any = schemaObjects.simpleHumanData();
                    obj.firstName = 'foobar';
                    obj['foo'] = 'bar';
                    await assertThrows(
                        () => collection.upsert(obj),
                        'RxError',
                        'dditional properti'
                    );
                    await db.close();
                });
            });
            describe('RxDocument.incrementalModify()', () => {
                it('should throw when not matching schema', async () => {
                    const db = await createRxDatabase({
                        name: randomToken(10),
                        storage
                    });
                    const collections = await db.addCollections({
                        human: {
                            schema: schemas.human
                        }
                    });
                    const collection = collections.human;
                    let doc = await collection.insert(schemaObjects.humanData());
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
                    db.close();
                });
            });
            describe('RxCollection().incrementalUpsert()', () => {
                describe('negative', () => {
                    it('should throw when not matching schema', async () => {
                        const db = await createRxDatabase({
                            name: randomToken(10),
                            storage
                        });
                        const collections = await db.addCollections({
                            human: {
                                schema: schemas.primaryHuman
                            }
                        });
                        const collection = collections.human;
                        const docData = schemaObjects.simpleHumanData();
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
                        db.close();
                    });
                });
            });
            describe('RxDocument.incrementalPatch()', () => {
                it('should crash on non document field', async () => {
                    const db = await createRxDatabase({
                        name: randomToken(10),
                        storage
                    });
                    const collections = await db.addCollections({
                        human: {
                            schema: schemas.nestedHuman
                        }
                    });
                    const collection = collections.human;
                    const doc = await collection.insert(schemaObjects.nestedHumanData());
                    await assertThrows(
                        () => doc.incrementalPatch({
                            foobar: 'foobar'
                        } as any),
                        'RxError'
                    );
                    db.close();
                });
            });
            describe('RxCollection() hooks', () => {
                it('should throw if preInsert hook invalidates the schema', async () => {
                    const db = await createRxDatabase({
                        name: randomToken(10),
                        storage
                    });
                    const collections = await db.addCollections({
                        human: {
                            schema: schemas.human
                        }
                    });
                    const collection = collections.human;
                    const human = schemaObjects.humanData();

                    collection.preInsert(function (doc: any) {
                        doc.lastName = 1337;
                    }, false);

                    await assertThrows(
                        () => collection.insert(human),
                        'RxError',
                        'not match'
                    );
                    db.close();
                });
            });
        });
        describe('issues', () => {
            /**
             * date-time is used by most users and also in the quickstart guide
             * and docs, so it must be supported by default.
             */
            it('#7253 should know about the date-time format by default by all validation plugins', async () => {
                const db = await createRxDatabase({
                    name: randomToken(10),
                    storage
                });
                const collections = await db.addCollections({
                    human: {
                        schema: {
                            version: 0,
                            primaryKey: 'id',
                            type: 'object',
                            properties: {
                                id: {
                                    type: 'string',
                                    maxLength: 100 // <- the primary key must have maxLength
                                },
                                name: {
                                    type: 'string'
                                },
                                done: {
                                    type: 'boolean'
                                },
                                timestamp: {
                                    type: 'string',
                                    format: 'date-time'
                                }
                            },
                            required: ['id', 'name', 'done', 'timestamp']
                        }
                    }
                });

                await collections.human.insert({
                    id: 'foobar',
                    name: 'barfoo',
                    done: true,
                    timestamp: new Date().toISOString()
                });


                await assertThrows(
                    () => collections.human.insert({
                        id: 'foobar2',
                        name: 'barfoo2',
                        done: true,
                        timestamp: 'broken-timestamp'
                    }),
                    'RxError',
                    'not match schema'
                );
                db.close();
            });
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
                const name = randomToken(10);

                // create a database
                const db = await createRxDatabase({
                    name,
                    storage,
                    ignoreDuplicate: true
                });
                // create a collection
                const colName = randomToken(10);
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
                    id: randomToken(12),
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
                db.close();
            });
            it('#5197 can\'t get data for object field defined with additionalProperties', async () => {
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
                            additionalProperties: {
                                type: 'object',
                                properties: {
                                    created: {
                                        type: 'integer',
                                    },
                                    name: {
                                        type: 'string',
                                    },
                                },
                                required: ['created', 'name'],
                            },
                        },
                    },
                };

                const name = randomToken(10);
                const db = await createRxDatabase({
                    name,
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

                // insert a document
                await collections.mycollection.insert({
                    passportId: 'foobar',
                    firstName: 'Bob',
                    lastName: 'Kelso',
                    age: 56,
                    tags,
                });

                const myDocument = await collections.mycollection
                    .findOne()
                    .exec();

                assert.deepStrictEqual(myDocument.toJSON().tags, tags);
                assert.ok(deepEqual(myDocument.get('tags'), tags));
                assert.deepStrictEqual(JSON.stringify(myDocument.tags), JSON.stringify(tags));

                db.close();
            });
        });
    })
);




describeParallel('validate.test.js (custom formats) ', () => {
    const schemaWithEmail = clone(schemas.human);
    schemaWithEmail.properties.email = {
        type: 'string',
        format: 'email'
    };
    describe('ajv', () => {
        it('should be able to register a custom format', async () => {
            const ajv = getAjv();
            ajv.addFormat('email', {
                type: 'string',
                validate: v => v.includes('@')
            });
            const db = await createRxDatabase({
                name: randomToken(10),
                storage: wrappedValidateAjvStorage({
                    storage: getRxStorageMemory()
                })
            });
            const collections = await db.addCollections({
                human: {
                    schema: schemaWithEmail
                }
            });
            const human: any = schemaObjects.humanData();
            human.email = 'asdf@example.com';
            await collections.human.insert(human);

            await assertThrows(
                async () => {
                    const invalidEmail: any = schemaObjects.humanData();
                    invalidEmail.email = 'foobar';
                    await collections.human.insert(invalidEmail);
                },
                'RxError',
                'must match format'
            );
            db.close();
        });
    });
    describe('z-schema', () => {
        it('should be able to register a custom format', async () => {
            ZSchemaClass.registerFormat('email', function (v: any) {
                return v.includes('@');
            });
            const db = await createRxDatabase({
                name: randomToken(10),
                storage: wrappedValidateZSchemaStorage({
                    storage: getRxStorageMemory()
                })
            });
            const collections = await db.addCollections({
                human: {
                    schema: schemaWithEmail
                }
            });
            const human: any = schemaObjects.humanData();
            human.email = 'asdf@example.com';
            await collections.human.insert(human);

            await assertThrows(
                async () => {
                    const invalidEmail: any = schemaObjects.humanData();
                    invalidEmail.email = 'foobar';
                    await collections.human.insert(invalidEmail);
                },
                'RxError',
                'pass validation for format email'
            );
            db.close();
        });
    });
});




