import assert from 'assert';
import clone from 'clone';
import {
    assertThrows
} from 'async-test-util';
import AsyncTestUtil from 'async-test-util';

import config, { describeParallel } from './config.ts';
import {
    schemaObjects,
    schemas
} from '../../plugins/test-utils/index.mjs';

import { checkSchema } from '../../plugins/dev-mode/index.mjs';

import {
    createRxDatabase,
    sortObject,
    randomToken,
    createRxSchema,
    RxJsonSchema,
    getIndexes,
    normalizeRxJsonSchema,
    getFinalFields,
    getPreviousVersions,
    getSchemaByObjectPath,
    fillWithDefaultSettings,
    fillObjectWithDefaults,
    defaultHashSha256,
    ensureNotFalsy
} from '../../plugins/core/index.mjs';

describeParallel('rx-schema.test.ts', () => {
    describe('static', () => {
        describe('.getIndexes()', () => {
            it('get single indexes', () => {
                const indexes = getIndexes(schemas.human);
                assert.strictEqual(indexes.length, 1);
                assert.deepStrictEqual(indexes[0], ['firstName']);
            });
            it('get multiple indexes', () => {
                const indexes = getIndexes(schemas.bigHuman);
                assert.ok(indexes.length > 1);
                assert.deepStrictEqual(indexes[0], ['firstName']);
                assert.deepStrictEqual(indexes[1], ['dnaHash']);
            });
            it('get sub-index', () => {
                const indexes = getIndexes(schemas.humanSubIndex);
                assert.strictEqual(indexes.length, 1);
                assert.deepStrictEqual(indexes[0], ['other.age']);
            });
            it('get no index', () => {
                const indexes = getIndexes(schemas.noIndexHuman);
                assert.strictEqual(indexes.length, 0);
            });
            it('get compoundIndex', () => {
                const indexes = getIndexes(schemas.compoundIndex);
                assert.ok(Array.isArray(indexes));
                assert.ok(Array.isArray(indexes[0]));
                assert.deepStrictEqual(indexes[0], ['age', 'passportCountry']);
            });
        });
        describe('.checkSchema()', () => {
            it('should not throw error for such schema', async () => {
                const userSchema = {
                    title: 'user schema',
                    description: 'describes a user',
                    type: 'object',
                    version: 0,

                    primaryKey: 'id',
                    properties: {
                        id: {
                            type: 'string',
                            maxLength: 100,
                        },
                        birthday: {
                            type: ['string', 'null'],
                            default: null,
                        },
                        createTime: {
                            type: 'string',
                        },
                    },
                    required: ['id', 'createTime'],
                };

                const db = await createRxDatabase({
                    name: randomToken(10),
                    storage: config.storage.getStorage(),
                });
                await db.addCollections({
                    users: {
                        schema: userSchema,
                    },
                });

                await db.close();
            });

            describe('positive', () => {
                it('validate human', () => {
                    checkSchema(schemas.human);
                });
                it('validate bigHuman', () => {
                    checkSchema(schemas.bigHuman);
                });
                it('validate without index', () => {
                    checkSchema(schemas.noIndexHuman);
                });
                it('validate with compoundIndexes', () => {
                    checkSchema(schemas.compoundIndex);
                });
                it('validate empty', () => {
                    checkSchema(schemas.empty);
                });
                it('validate with defaults', () => {
                    checkSchema(schemas.humanDefault);
                });
                it('validate point', () => {
                    checkSchema(schemas.point);
                });
                it('validates deep nested indexes', () => {
                    checkSchema(schemas.humanWithDeepNestedIndexes);
                });
                it('validate anyOf', () => {
                    checkSchema({
                        title: 'anyOf schema',
                        version: 0,
                        description: 'uses anyOf',
                        primaryKey: 'id',
                        type: 'object',
                        properties: {
                            id: {
                                type: 'string',
                                maxLength: 100
                            },
                            foo: {
                                anyOf: [
                                    {
                                        type: 'string'
                                    },
                                    {
                                        type: 'number'
                                    }
                                ]
                            },
                        },
                        required: ['id', 'foo']
                    });
                });
                it('validate items array', () => {
                    checkSchema({
                        title: 'items array schema',
                        version: 0,
                        description: 'uses items array',
                        primaryKey: 'id',
                        type: 'object',
                        properties: {
                            id: {
                                type: 'string',
                                maxLength: 100
                            },
                            foo: {
                                type: 'array',
                                items: [
                                    {
                                        type: 'number'
                                    }
                                ]
                            },
                        },
                        required: ['id', 'foo']
                    });
                });
            });
            describe('negative', () => {
                it('break when index defined at object property level', async () => {
                    await assertThrows(() => checkSchema({
                        version: 0,
                        primaryKey: 'id',
                        type: 'object',
                        properties: {
                            id: {
                                type: 'string',
                                maxLength: 100
                            },
                            name: {
                                type: 'string',
                                index: true
                            } as any,
                            job: {
                                type: 'object',
                                properties: {
                                    name: {
                                        type: 'string',
                                        index: true
                                    } as any,
                                    manager: {
                                        type: 'object',
                                        properties: {
                                            fullName: {
                                                type: 'string',
                                                index: true
                                            } as any
                                        }
                                    }
                                }
                            }
                        },
                        required: ['job']
                    }), 'RxError', 'SC26');
                });
                it('throw when underscore field is used as property name', async () => {
                    await assertThrows(() => checkSchema({
                        title: 'schema',
                        version: 0,
                        primaryKey: '_asdf',
                        type: 'object',
                        properties: {
                            _asdf: {
                                type: 'string',
                                maxLength: 100
                            },
                            firstName: {
                                type: 'string'
                            }
                        },
                        required: ['firstName']
                    } as any), 'RxError');
                });
                it('break when index is no string', () => {
                    assert.throws(() => checkSchema(schemas.noStringIndex));
                });
                it('break when index does not exist in schema properties', () => {
                    assert.throws(() => checkSchema(schemas.notExistingIndex));
                });
                it('break when index is string but too long', async () => {
                    await AsyncTestUtil.assertThrows(
                        () => checkSchema({
                            title: 'schema',
                            version: 0,
                            primaryKey: 'id',
                            type: 'object',
                            properties: {
                                id: {
                                    type: 'string',
                                    maxLength: 100
                                },
                                firstName: {
                                    type: 'string',
                                    maxLength: 10000000
                                }
                            },
                            indexes: [
                                'firstName'
                            ],
                            required: ['firstName']
                        }),
                        'RxError',
                        'SC42'
                    );
                });
                it('break when primaryKey maxLength string but too long', async () => {
                    await AsyncTestUtil.assertThrows(
                        () => checkSchema({
                            title: 'schema',
                            version: 0,
                            primaryKey: 'id',
                            type: 'object',
                            properties: {
                                id: {
                                    type: 'string',
                                    maxLength: 10000000
                                },
                                firstName: {
                                    type: 'string',
                                    maxLength: 10000000
                                }
                            },
                            indexes: [
                                'firstName'
                            ],
                            required: ['firstName']
                        }),
                        'RxError',
                        'SC42'
                    );
                });
                it('break compoundIndex key is no string', () => {
                    assert.throws(() => checkSchema(schemas.compoundIndexNoString));
                });
                it('break when dots in fieldname', () => {
                    assert.throws(() => checkSchema({
                        title: 'schema',
                        version: 0,
                        description: 'dot in fieldname',
                        primaryKey: 'my.field',
                        type: 'object',
                        properties: {
                            'my.field': {
                                type: 'string',
                                maxLength: 100
                            }
                        }
                    }));
                });
                it('break when required is set via required: true', () => {
                    assert.throws(() => checkSchema({
                        title: 'schema',
                        version: 0,
                        primaryKey: 'myfield',
                        type: 'object',
                        properties: {
                            'myfield': {
                                type: 'string',
                                required: true,
                                maxLength: 100
                            } as any
                        }
                    }));
                });

                /**
                 * things to make sure there a no conflicts with the RxDocument-proxy
                 */
                it('should not allow $-char in fieldnames', () => {
                    assert.throws(() => checkSchema({
                        title: 'schema',
                        version: 0,
                        primaryKey: 'id',
                        type: 'object',
                        properties: {
                            id: {
                                type: 'string',
                                maxLength: 100
                            },
                            'firstName$': {
                                type: 'string'
                            }
                        }
                    }));
                    assert.throws(() => checkSchema({
                        title: 'schema',
                        version: 0,
                        primaryKey: 'id',
                        description: '$ in fieldname',
                        type: 'object',
                        properties: {
                            id: {
                                type: 'string',
                                maxLength: 100
                            },
                            'first$Name': {
                                type: 'string'
                            }
                        }
                    }));
                });
                it('should not allow $-char in nested fieldnames', () => {
                    assert.throws(() => checkSchema({
                        title: 'schema',
                        version: 0,
                        description: '$ in nested fieldname',
                        primaryKey: 'id',
                        type: 'object',
                        properties: {
                            id: {
                                type: 'string',
                                maxLength: 100
                            },
                            'things': {
                                type: 'object',
                                properties: {
                                    first$Name: {
                                        type: 'string'
                                    }
                                }
                            }
                        }
                    }));
                    assert.throws(() => checkSchema({
                        title: 'schema',
                        version: 0,
                        description: '$ in nested fieldname',
                        primaryKey: 'id',
                        type: 'object',
                        properties: {
                            id: {
                                type: 'string',
                                maxLength: 100
                            },
                            'things': {
                                type: 'object',
                                properties: {
                                    firstName$: {
                                        type: 'string'
                                    }
                                }
                            }
                        }
                    }));
                });
                it('should not allow ending lodash _ in fieldnames (reserved for populate)', async () => {
                    await assertThrows(() => checkSchema({
                        title: 'schema',
                        version: 0,
                        primaryKey: 'id',
                        description: '_ in fieldname',
                        type: 'object',
                        properties: {
                            id: {
                                type: 'string',
                                maxLength: 100
                            },
                            'firstName_': {
                                type: 'string'
                            }
                        }
                    }), 'RxError', 'SC1');
                    // nested
                    await assertThrows(() => checkSchema({
                        title: 'schema',
                        version: 0,
                        description: 'dot in fieldname',
                        primaryKey: 'id',
                        type: 'object',
                        properties: {
                            id: {
                                type: 'string',
                                maxLength: 100
                            },
                            'foo': {
                                type: 'object',
                                properties: {
                                    'name_': {
                                        type: 'string'
                                    }
                                }
                            }
                        }
                    }), 'RxError', 'SC1');
                });
                it('should not allow RxDocument-properties as top-fieldnames (own)', () => {
                    assert.throws(() => checkSchema({
                        title: 'schema',
                        version: 0,
                        description: 'collection as fieldname',
                        primaryKey: 'collection',
                        type: 'object',
                        properties: {
                            collection: {
                                type: 'string',
                                maxLength: 100
                            }
                        }
                    }));
                });
                it('should not allow RxDocument-properties as top-fieldnames (prototype)', () => {
                    assert.throws(() => checkSchema({
                        title: 'schema',
                        version: 0,
                        description: 'populate as fieldname',
                        primaryKey: 'populate',
                        type: 'object',
                        properties: {
                            populate: {
                                type: 'string',
                                maxLength: 100
                            }
                        }
                    }));
                });
                it('throw when no version', () => {
                    assert.throws(() => checkSchema({
                        title: 'schema',
                        description: 'schema without version',
                        type: 'object',
                        properties: {
                            'foobar': {
                                type: 'string'
                            }
                        }
                    } as any));
                });
                it('throw when version < 0', () => {
                    assert.throws(() => checkSchema({
                        title: 'schema',
                        version: -10,
                        description: 'schema with negative version',
                        primaryKey: 'foobar',
                        type: 'object',
                        properties: {
                            'foobar': {
                                type: 'string',
                                maxLength: 100
                            }
                        }
                    }));
                });
                it('throw when version no number', () => {
                    assert.throws(() => checkSchema({
                        title: 'schema',
                        version: 'foobar',
                        description: 'save as fieldname',
                        primaryKey: 'foobar',
                        properties: {
                            'foobar': {
                                type: 'string',
                                maxLength: 100
                            }
                        }
                    } as any));
                });
                it('throw when defaults on non-first-level field', () => {
                    assert.throws(() => checkSchema({
                        title: 'schema',
                        version: 0,
                        description: 'save as fieldname',
                        primaryKey: 'foobar',
                        type: 'object',
                        properties: {
                            foobar: {
                                type: 'string',
                                maxLength: 100
                            },
                            deeper: {
                                type: 'object',
                                properties: {
                                    name: {
                                        type: 'string',
                                        default: 'foobar'
                                    } as any
                                }
                            }
                        }
                    }));
                });
                it('throw when _id is not primary', () => {
                    assert.throws(() => checkSchema({
                        title: 'schema',
                        version: 0,
                        primaryKey: 'userId',
                        description: 'save as fieldname',
                        type: 'object',
                        properties: {
                            userId: {
                                type: 'string',
                                maxLength: 100
                            },
                            _id: {
                                type: 'string',
                            },
                            firstName: {
                                type: 'string'
                            }
                        },
                        required: ['firstName']
                    }));
                });
                /**
                 * @link https://github.com/pubkey/rxdb/issues/4926#issuecomment-1712223984
                 */
                it('throw when $ref field is used', async () => {
                    await assertThrows(
                        () => checkSchema({
                            version: 0,
                            primaryKey: 'userId',
                            type: 'object',
                            properties: {
                                userId: {
                                    type: 'string',
                                    maxLength: 100
                                },
                                sub: {
                                    $ref: '#/definitions/person'
                                } as any
                            },
                            required: ['firstName']
                        }),
                        'RxError',
                        'SC40'
                    );
                });
            });
        });
        describe('.fillWithDefaultSettings() / .normalizeRxJsonSchema()', () => {
            it('should sort array with objects and strings', () => {
                const val = ['firstName', 'lastName', {
                    name: 2
                }];
                const normalized = sortObject(val);
                assert.deepStrictEqual(val, normalized);
            });
            it('should be the same object', () => {
                const schema = normalizeRxJsonSchema(schemas.humanNormalizeSchema1);
                assert.deepStrictEqual(schema, schemas.humanNormalizeSchema1);
            });
            it('should deep sort one schema with different orders to be the same', () => {
                const schema1 = normalizeRxJsonSchema(schemas.humanNormalizeSchema1);
                const schema2 = normalizeRxJsonSchema(schemas.humanNormalizeSchema2);
                assert.deepStrictEqual(schema1, schema2);
            });
            it('should not sort indexes array in the schema (related with https://github.com/pubkey/rxdb/pull/1695#issuecomment-554636433)', () => {
                const schema = normalizeRxJsonSchema(schemas.humanWithSimpleAndCompoundIndexes);
                assert.deepStrictEqual(schema.indexes, schemas.humanWithSimpleAndCompoundIndexes.indexes);
            });
            it('should have added the primaryKey to indexes that did not contain it', () => {
                const schema: RxJsonSchema<any> = fillWithDefaultSettings({
                    primaryKey: 'id',
                    version: 0,
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            maxLength: 100
                        }
                    },
                    required: ['id'],
                    indexes: [
                        'age',
                        ['foo', 'bar'],
                        ['bar', 'id', 'foo']
                    ]
                });
                const normalizedSchema = normalizeRxJsonSchema(schema);
                ensureNotFalsy(normalizedSchema.indexes).forEach(index => {
                    assert.ok(index.includes('id'));
                });
            });
        });
        describe('.create()', () => {
            describe('positive', () => {
                it('create human', () => {
                    const schema = createRxSchema(schemas.human, defaultHashSha256);
                    assert.strictEqual(schema.constructor.name, 'RxSchema');
                });
                it('create nested', () => {
                    const schema = createRxSchema(schemas.nestedHuman, defaultHashSha256);
                    assert.strictEqual(schema.constructor.name, 'RxSchema');
                });
                it('create point', () => {
                    const schema = createRxSchema(schemas.point, defaultHashSha256);
                    assert.strictEqual(schema.constructor.name, 'RxSchema');
                });
                it('should have indexes human', () => {
                    const schema = createRxSchema(schemas.human, defaultHashSha256);
                    assert.strictEqual(schema.indexes[0][0], '_deleted');
                    assert.strictEqual(schema.indexes[0][1], 'firstName');
                });
            });
            describe('negative', () => {
                it('broken schema (nostringIndex)', () => {
                    assert.throws(() => createRxSchema(schemas.noStringIndex, defaultHashSha256));
                });
            });
        });
        describe('.getFinalFields()', () => {
            it('should contain the field', () => {
                const ret = getFinalFields({
                    version: 0,
                    primaryKey: 'myField',
                    type: 'object',
                    properties: {
                        myField: {
                            type: 'string',
                            maxLength: 100,
                            final: true
                        }
                    }
                });
                assert.ok(ret.includes('myField'));
            });
            it('should contain the primary', () => {
                const ret = getFinalFields({
                    version: 0,
                    primaryKey: 'myField',
                    type: 'object',
                    properties: {
                        myField: {
                            type: 'string',
                            maxLength: 100
                        }
                    }
                });
                assert.deepStrictEqual(ret, ['myField']);
            });
        });
    });
    describe('instance', () => {
        describe('.getPreviousVersions()', () => {
            it('get empty array when current==0', () => {
                const schema = createRxSchema({
                    title: 'schema',
                    version: 0,
                    primaryKey: 'foobar',
                    type: 'object',
                    properties: {
                        'foobar': {
                            type: 'string',
                            maxLength: 100
                        }
                    }
                }, defaultHashSha256);
                assert.deepStrictEqual(
                    getPreviousVersions(schema.jsonSchema),
                    []
                );
            });
            it('get valid array when current==5', () => {
                const schema = createRxSchema({
                    title: 'schema',
                    version: 5,
                    primaryKey: 'foobar',
                    type: 'object',
                    properties: {
                        'foobar': {
                            type: 'string',
                            maxLength: 100
                        }
                    }
                }, defaultHashSha256);
                assert.deepStrictEqual(
                    getPreviousVersions(schema.jsonSchema),
                    [0, 1, 2, 3, 4]
                );
            });
        });
        describe('.hash', () => {
            describe('positive', () => {
                it('should hash', async () => {
                    const schema = createRxSchema(schemas.human, defaultHashSha256);
                    const hash = await schema.hash;
                    assert.strictEqual(typeof hash, 'string');
                    assert.ok(hash.length >= 5);
                });
                it('should normalize one schema with two different orders and generate for each the same hash', async () => {
                    const schema1 = createRxSchema(schemas.humanNormalizeSchema1, defaultHashSha256);
                    const schema2 = createRxSchema(schemas.humanNormalizeSchema2, defaultHashSha256);
                    const hash1 = await schema1.hash;
                    const hash2 = await schema2.hash;
                    assert.strictEqual(hash1, hash2);
                });
                /**
                 * The order could contain meaning so having a different order
                 * should result in a different hash.
                 * Also sorting is not equal on all JavaScript runtimes,
                 * so by not re-ordering we can ensure deterministic hashing.
                 * @link https://github.com/pubkey/rxdb/pull/4005
                 */
                it('#4005 should respect the sort order', async () => {
                    const schema1 = createRxSchema(Object.assign({}, schemas.humanDefault, {
                        indexes: ['firstName', 'lastName']
                    }), defaultHashSha256);
                    const schema2 = createRxSchema(Object.assign({}, schemas.humanDefault, {
                        indexes: ['lastName', 'firstName']
                    }), defaultHashSha256);
                    const hash1 = await schema1.hash;
                    const hash2 = await schema2.hash;
                    assert.ok(hash1 !== hash2);
                });
            });
        });
        describe('.validateChange()', () => {
            describe('positive', () => {
                it('should allow a valid change', () => {
                    const schema = createRxSchema(schemas.human, defaultHashSha256);
                    const dataBefore = schemaObjects.humanData();
                    const dataAfter = clone(dataBefore);
                    dataAfter.age = 100;

                    schema.validateChange(dataBefore, dataAfter);
                });
            });
            describe('negative', () => {
                it('should not allow to change the primary', async () => {
                    const schema = createRxSchema(schemas.primaryHuman, defaultHashSha256);
                    const dataBefore = schemaObjects.humanData();
                    const dataAfter = clone(dataBefore);
                    dataAfter.passportId = 'foobar';

                    await AsyncTestUtil.assertThrows(
                        () => schema.validateChange(dataBefore, dataAfter),
                        'RxError',
                        'final'
                    );
                });
                it('should not allow to change a final field', async () => {
                    const schema = createRxSchema(schemas.humanFinal, defaultHashSha256);
                    const dataBefore = schemaObjects.humanData();
                    dataBefore.age = 1;
                    const dataAfter = clone(dataBefore);
                    dataAfter.age = 100;

                    await AsyncTestUtil.assertThrows(
                        () => schema.validateChange(dataBefore, dataAfter),
                        'RxError',
                        'final'
                    );
                });
            });
        });
        describe('.getSchemaByObjectPath()', () => {
            describe('positive', () => {
                it('get firstLevel', () => {
                    const schema = createRxSchema(schemas.human, defaultHashSha256);
                    const schemaObj = getSchemaByObjectPath(schema.jsonSchema, 'passportId');
                    assert.strictEqual(schemaObj.type, 'string');
                });
                it('get deeper', () => {
                    const schema = createRxSchema(schemas.nestedHuman, defaultHashSha256);
                    const schemaObj = getSchemaByObjectPath(schema.jsonSchema, 'mainSkill');
                    assert.ok(schemaObj.properties);
                });
                it('get nested', () => {
                    const schema = createRxSchema(schemas.nestedHuman, defaultHashSha256);
                    const schemaObj = getSchemaByObjectPath(schema.jsonSchema, 'mainSkill.name');
                    assert.strictEqual(schemaObj.type, 'string');
                });
            });
            describe('negative', () => { });
        });
        describe('.fillObjectWithDefaults()', () => {
            describe('positive', () => {
                it('should fill all unset fields', () => {
                    const schema = createRxSchema(schemas.humanDefault, defaultHashSha256);
                    const data = {
                        foo: 'bar'
                    };
                    const filled = fillObjectWithDefaults(schema, data);
                    assert.strictEqual(filled.foo, 'bar');
                    assert.strictEqual(filled.age, 20);
                });
                it('should not overwrite given values', () => {
                    const schema = createRxSchema(schemas.humanDefault, defaultHashSha256);
                    const data = {
                        foo: 'bar',
                        age: 40
                    };
                    const data2 = clone(data);
                    const filled = fillObjectWithDefaults(schema, data);
                    const filled2 = fillObjectWithDefaults(schema, data2);
                    assert.strictEqual(filled.foo, 'bar');
                    assert.strictEqual(filled.age, 40);
                    assert.strictEqual(filled2.foo, 'bar');
                    assert.strictEqual(filled2.age, 40);
                });
            });
        });
    });
    describe('issues', () => {
        it('#590 Strange schema behavior with sub-sub-index', async () => {
            const schema: RxJsonSchema<{ id: string; fileInfo: any; }> = {
                version: 0,
                primaryKey: 'id',
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        maxLength: 100
                    },
                    fileInfo: {
                        type: 'object',
                        properties: {
                            watch: {
                                type: 'object',
                                properties: {
                                    time: {
                                        type: 'number',
                                        minimum: 0,
                                        maximum: 10000,
                                        multipleOf: 1
                                    }
                                }
                            }
                        },
                    },
                },
                indexes: ['fileInfo.watch.time']
            };
            const db = await createRxDatabase({
                name: randomToken(10),
                storage: config.storage.getStorage()
            });
            const cols = await db.addCollections({
                items: {
                    schema
                }
            });

            await cols.items.insert({
                id: '1',
                fileInfo: {
                    watch: {
                        time: 1
                    }
                }
            });

            const query = cols.items.find({
                selector: {
                    'fileInfo.watch.time': {
                        $gt: -999999999999999
                    }
                },
                sort: [
                    { 'fileInfo.watch.time': 'asc' }
                ]
            });

            const found = await query.exec();
            assert.strictEqual(found.length, 1);
            assert.strictEqual(found[0].fileInfo.watch.time, 1);
            db.close();
        });
        it('#620 indexes should not be required', async () => {
            if (config.storage.name.includes('dexie')) {
                /**
                 * IndexedDB has some non-indexable types, so this does not work in dexie.
                 * @link https://github.com/pubkey/rxdb/pull/6643#issuecomment-2505310082
                 */
                return;
            }
            const mySchema: RxJsonSchema<{ passportId: string; firstName: string; lastName: string; age: number; }> = {
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
                        type: 'string',
                        maxLength: 100
                    },
                    age: {
                        type: 'integer',
                        minimum: 0,
                        maximum: 150
                    }
                },
                indexes: ['lastName']
            };
            // create a database
            const db = await createRxDatabase({
                name: randomToken(10),
                storage: config.storage.getStorage()
            });
            const collections = await db.addCollections({
                test: {
                    schema: mySchema
                }
            });
            await collections.test.insert({
                passportId: 'foobar',
                firstName: 'Bob',
                age: 56
            });
            db.close();
        });
        it('#697 Indexes do not work in objects named "properties"', async () => {
            const mySchema: RxJsonSchema<{ id: string; properties: any; }> = {
                version: 0,
                primaryKey: 'id',
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        maxLength: 100
                    },
                    properties: {
                        type: 'object',
                        properties: {
                            name: {
                                type: 'string',
                                maxLength: 100
                            },
                            content: {
                                type: 'string',
                                maxLength: 100
                            }
                        }
                    },
                },
                indexes: ['properties.name', 'properties.content']
            };

            // create a database
            const db = await createRxDatabase({
                name: randomToken(10),
                storage: config.storage.getStorage()
            });
            const collections = await db.addCollections({
                test: {
                    schema: mySchema
                }
            });

            await collections.test.insert({
                id: randomToken(12),
                properties: {
                    name: 'Title',
                    content: 'Post content'
                }
            });

            db.close();
        });
        it('#697(2) should also work deep nested', async () => {
            const mySchema: RxJsonSchema<{ id: string; properties: any; }> = {
                version: 0,
                type: 'object',
                primaryKey: 'id',
                properties: {
                    id: {
                        type: 'string',
                        maxLength: 100
                    },
                    properties: {
                        type: 'object',
                        properties: {
                            name: {
                                type: 'string',
                                maxLength: 100
                            },
                            properties: {
                                type: 'string',
                                maxLength: 100
                            }
                        }
                    },
                },
                indexes: ['properties.name', 'properties.properties']
            };

            // create a database
            const db = await createRxDatabase({
                name: randomToken(10),
                storage: config.storage.getStorage()
            });
            const collections = await db.addCollections({
                test: {
                    schema: mySchema
                }
            });

            await collections.test.insert({
                id: randomToken(12),
                properties: {
                    name: 'Title',
                    properties: 'Post content'
                }
            });

            assert.deepStrictEqual(
                [
                    ['_deleted', 'properties.name', 'id'],
                    ['_deleted', 'properties.properties', 'id'],
                    ['_meta.lwt', 'id']
                ],
                collections.test.schema.indexes
            );

            db.close();
        });
        /**
         * @link https://github.com/pubkey/rxdb/issues/3994#issuecomment-1260073490
         */
        it('#3994 must work with a boolean index', async () => {
            if (config.storage.name.includes('random-delay')) {
                return;
            }

            const db = await createRxDatabase({
                name: randomToken(10),
                storage: config.storage.getStorage()
            });

            const mySchema = {
                'keyCompression': false,
                'version': 0,
                'primaryKey': '_id',
                'type': 'object',
                'properties': {
                    '_id': {
                        'type': 'string',
                        'maxLength': 100
                    },
                    'data': {
                        'type': 'object'
                    },
                    'isNew': {
                        'type': 'boolean',
                        'default': false
                    },
                    'createdAt': {
                        'type': 'string',
                        'maxLength': 24
                    },
                    'updatedAt': {
                        'type': 'string',
                        'maxLength': 24
                    }
                },
                'required': [
                    '_id',
                    'data',
                    'createdAt',
                    'updatedAt',
                    'isNew'
                ],
                'indexes': [
                    'createdAt',
                    'updatedAt',
                    'isNew'
                ]
            };
            await db.addCollections({
                test: {
                    schema: mySchema
                }
            });

            db.close();
        });
        it('#4951 patternProperties are allowed', async () => {
            /**
             * Dexie.js does not support boolean indexes,
             * see docs-src/rx-storage-dexie.md
             */
            if (config.storage.name.includes('dexie')) {
                return;
            }

            const db = await createRxDatabase({
                name: randomToken(10),
                storage: config.storage.getStorage()
            });

            const mySchema = {
                'keyCompression': false,
                'version': 0,
                'primaryKey': 'passportId',
                'type': 'object',
                'properties': {
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
                        patternProperties: {
                            '.*': {
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
                            }
                        },
                    },
                },
            };
            const collections = await db.addCollections({
                test: {
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
            await collections.test.insert({
                passportId: 'foobar',
                firstName: 'Bob',
                lastName: 'Kelso',
                age: 56,
                tags,
            });

            const myDocument = await collections.test
                .findOne()
                .exec();

            assert.deepStrictEqual(myDocument.toJSON().tags.hello, tags.hello, 'myDocument.toJSON().tags.hello');
            assert.deepStrictEqual(myDocument.toJSON().tags.world, tags.world, 'myDocument.toJSON().tags.world');
            assert.deepStrictEqual(Object.keys(myDocument.toJSON().tags), Object.keys(tags), 'Object.keys(myDocument.toJSON().tags)');

            assert.deepStrictEqual(JSON.stringify(myDocument.get('tags').hello), JSON.stringify(tags.hello), 'myDocument.get(\'tags\').hello');
            assert.deepStrictEqual(JSON.stringify(myDocument.get('tags').world), JSON.stringify(tags.world), 'myDocument.get(\'tags\').world');

            assert.deepStrictEqual(JSON.stringify(myDocument.tags.hello), JSON.stringify(tags.hello), 'myDocument.tags.hello');
            assert.deepStrictEqual(JSON.stringify(myDocument.tags.world), JSON.stringify(tags.world), 'myDocument.tags.world');

            db.close();
        });
        /**
         * Using Infinity as "maximum" does not work
         * and should throw a proper error.
         */
        it('broken on Infinity numbers in index sizes', async () => {
            const db = await createRxDatabase({
                name: randomToken(10),
                storage: config.storage.getStorage()
            });

            const brokenSchemas: RxJsonSchema<any>[] = [
                {
                    version: 0,
                    type: 'object',
                    primaryKey: 'id',
                    properties: {
                        id: {
                            type: 'string',
                            maxLength: 100
                        },
                        nr: {
                            type: 'number',
                            minimum: -Infinity,
                            maximum: 100,
                            multipleOf: 1
                        }
                    },
                    indexes: [
                        ['nr']
                    ]
                },
                {
                    version: 0,
                    type: 'object',
                    primaryKey: 'id',
                    properties: {
                        id: {
                            type: 'string',
                            maxLength: Infinity
                        }
                    },
                    indexes: [
                        ['nr']
                    ]
                },
                {
                    version: 0,
                    type: 'object',
                    primaryKey: 'id',
                    properties: {
                        id: {
                            type: 'string',
                            maxLength: 100
                        },
                        nr: {
                            type: 'number',
                            minimum: 0,
                            maximum: Infinity,
                            multipleOf: 1
                        }
                    },
                    indexes: [
                        ['nr']
                    ]
                }
            ];

            for (const schema of brokenSchemas) {
                await assertThrows(
                    () => db.addCollections({
                        test: {
                            schema
                        }
                    }),
                    'RxError',
                    'SC41'
                );
            }

            db.close();
        });
    });
    describe('wait a bit', () => {
        it('w8 a bit', async () => {
            await AsyncTestUtil.wait(0);
        });
    });
});
