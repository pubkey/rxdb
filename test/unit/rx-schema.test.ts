import assert from 'assert';
import clone from 'clone';
import AsyncTestUtil from 'async-test-util';

import config from './config';
import * as schemas from '../helper/schemas';
import * as schemaObjects from '../helper/schema-objects';

import { checkSchema } from '../../plugins/dev-mode';

import {
    createRxDatabase,
    sortObject,
    generateId,
    randomCouchString,
    createRxSchema,
    RxJsonSchema,
    getIndexes,
    normalize,
    getFinalFields,
    getPreviousVersions
} from '../../plugins/core';

config.parallel('rx-schema.test.js', () => {
    describe('static', () => {
        describe('.getIndexes()', () => {
            it('get single indexes', () => {
                const indexes = getIndexes(schemas.human);
                assert.strictEqual(indexes.length, 1);
                assert.deepStrictEqual(indexes[0], ['passportId']);
            });
            it('get multiple indexes', () => {
                const indexes = getIndexes(schemas.bigHuman);
                assert.ok(indexes.length > 1);
                assert.deepStrictEqual(indexes[0], ['passportId']);
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
                assert.deepStrictEqual(indexes[0], ['passportId', 'passportCountry']);
            });
            it('get index from array', () => {
                const indexes = getIndexes(schemas.humanArrayIndex);
                assert.ok(Array.isArray(indexes));
                assert.ok(Array.isArray(indexes[0]));
                assert.deepStrictEqual(indexes[0], ['jobs.[].name']);
            });
        });
        describe('.checkSchema()', () => {
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
                it('validate _id when primary', () => {
                    checkSchema({
                        title: 'schema',
                        version: 0,
                        type: 'object',
                        properties: {
                            _id: {
                                type: 'string',
                                primary: true
                            },
                            firstName: {
                                type: 'string'
                            }
                        },
                        required: ['firstName']
                    });
                });
                it('validates deep nested indexes', () => {
                    checkSchema(schemas.humanWithDeepNestedIndexes);
                });
            });
            describe('negative', () => {
                it('break when index defined at object property level', () => {
                    assert.throws(() => checkSchema({
                        version: 0,
                        type: 'object',
                        properties: {
                            id: {
                                type: 'string',
                                primary: true
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
                    }), Error);
                });
                it('break when compoundIndex is specified in a separate field', () => {
                    assert.throws(() => checkSchema({
                        version: 0,
                        type: 'object',
                        properties: {
                            id: {
                                type: 'string',
                                primary: true
                            },
                            name: {
                                type: 'string',
                                index: true
                            } as any
                        },
                        compoundIndexes: ['id', 'name']
                    } as any), Error);
                });
                it('break when index is no string', () => {
                    assert.throws(() => checkSchema(schemas.noStringIndex), Error);
                });
                it('break when index does not exist in schema properties', () => {
                    assert.throws(() => checkSchema(schemas.notExistingIndex), Error);
                });
                it('break compoundIndex key is no string', () => {
                    assert.throws(() => checkSchema(schemas.compoundIndexNoString), Error);
                });
                it('break on wrong formated compundIndex', () => {
                    assert.throws(() => checkSchema(schemas.wrongCompoundFormat), Error);
                });
                it('break when dots in fieldname', () => {
                    assert.throws(() => checkSchema({
                        title: 'schema',
                        version: 0,
                        description: 'dot in fieldname',
                        type: 'object',
                        properties: {
                            'my.field': {
                                type: 'string'
                            }
                        }
                    }), Error);
                });
                it('break when required is set via required: true', () => {
                    assert.throws(() => checkSchema({
                        title: 'schema',
                        version: 0,
                        description: 'dot in fieldname',
                        type: 'object',
                        properties: {
                            'myfield': {
                                type: 'string',
                                required: true
                            } as any
                        }
                    }), Error);
                });

                /**
                 * things to make sure there a no conflicts with the RxDocument-proxy
                 */
                it('should not allow $-char in fieldnames', () => {
                    assert.throws(() => checkSchema({
                        title: 'schema',
                        version: 0,
                        description: 'dot in fieldname',
                        type: 'object',
                        properties: {
                            'firstName$': {
                                type: 'string'
                            }
                        }
                    }), Error);
                    assert.throws(() => checkSchema({
                        title: 'schema',
                        version: 0,
                        description: '$ in fieldname',
                        type: 'object',
                        properties: {
                            'first$Name': {
                                type: 'string'
                            }
                        }
                    }), Error);
                });
                it('should not allow $-char in nested fieldnames', () => {
                    assert.throws(() => checkSchema({
                        title: 'schema',
                        version: 0,
                        description: '$ in nested fieldname',
                        type: 'object',
                        properties: {
                            'things': {
                                type: 'object',
                                properties: {
                                    first$Name: {
                                        type: 'string'
                                    }
                                }
                            }
                        }
                    }), Error);
                    assert.throws(() => checkSchema({
                        title: 'schema',
                        version: 0,
                        description: '$ in nested fieldname',
                        type: 'object',
                        properties: {
                            'things': {
                                type: 'object',
                                properties: {
                                    firstName$: {
                                        type: 'string'
                                    }
                                }
                            }
                        }
                    }), Error);
                });
                it('should not allow ending lodash _ in fieldnames (reserved for populate)', () => {
                    assert.throws(() => checkSchema({
                        title: 'schema',
                        version: 0,
                        description: '_ in fieldname',
                        type: 'object',
                        properties: {
                            'firstName_': {
                                type: 'string'
                            }
                        }
                    }), Error, 'underscore');
                    // nested
                    assert.throws(() => checkSchema({
                        title: 'schema',
                        version: 0,
                        description: 'dot in fieldname',
                        type: 'object',
                        properties: {
                            'foo': {
                                type: 'object',
                                properties: {
                                    'name_': {
                                        type: 'string'
                                    }
                                }
                            }
                        }
                    }), Error, 'underscore');
                });
                it('should not allow RxDocument-properties as top-fieldnames (own)', () => {
                    assert.throws(() => checkSchema({
                        title: 'schema',
                        version: 0,
                        description: 'collection as fieldname',
                        type: 'object',
                        properties: {
                            'collection': {
                                type: 'string'
                            }
                        }
                    }), Error);
                });
                it('should not allow RxDocument-properties as top-fieldnames (prototype)', () => {
                    assert.throws(() => checkSchema({
                        title: 'schema',
                        version: 0,
                        description: 'save as fieldname',
                        type: 'object',
                        properties: {
                            'save': {
                                type: 'string'
                            }
                        }
                    }), Error);
                });
                it('throw when no version', () => {
                    assert.throws(() => checkSchema({
                        title: 'schema',
                        description: 'save as fieldname',
                        type: 'object',
                        properties: {
                            'foobar': {
                                type: 'string'
                            }
                        }
                    } as any), Error);
                });
                it('throw when version < 0', () => {
                    assert.throws(() => checkSchema({
                        title: 'schema',
                        version: -10,
                        description: 'save as fieldname',
                        type: 'object',
                        properties: {
                            'foobar': {
                                type: 'string'
                            }
                        }
                    }), Error);
                });
                it('throw when version no number', () => {
                    assert.throws(() => checkSchema({
                        title: 'schema',
                        version: 'foobar',
                        description: 'save as fieldname',
                        properties: {
                            'foobar': {
                                type: 'string'
                            }
                        }
                    } as any), Error);
                });
                it('throw when defaults on non-first-level field', () => {
                    assert.throws(() => checkSchema({
                        title: 'schema',
                        version: 0,
                        description: 'save as fieldname',
                        type: 'object',
                        properties: {
                            foobar: {
                                type: 'string'
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
                    }), Error);
                });
                it('throw when _id is not primary', () => {
                    assert.throws(() => checkSchema({
                        title: 'schema',
                        version: 0,
                        description: 'save as fieldname',
                        type: 'object',
                        properties: {
                            userId: {
                                type: 'string',
                                primary: true
                            },
                            _id: {
                                type: 'string',
                            },
                            firstName: {
                                type: 'string'
                            }
                        },
                        required: ['firstName']
                    }), Error);
                });
            });
        });
        describe('.normalize()', () => {
            it('should sort array with objects and strings', () => {
                const val = ['firstName', 'lastName', {
                    name: 2
                }];
                const normalized = sortObject(val);
                assert.deepStrictEqual(val, normalized);
            });
            it('should be the same object', () => {
                const schema = normalize(schemas.humanNormalizeSchema1);
                assert.deepStrictEqual(schema, schemas.humanNormalizeSchema1);
            });
            it('should deep sort one schema with different orders to be the same', () => {
                const schema1 = normalize(schemas.humanNormalizeSchema1);
                const schema2 = normalize(schemas.humanNormalizeSchema2);
                assert.deepStrictEqual(schema1, schema2);
            });
            it('should not sort indexes array in the schema (related with https://github.com/pubkey/rxdb/pull/1695#issuecomment-554636433)', () => {
                const schema = normalize(schemas.humanWithSimpleAndCompoundIndexes);
                assert.deepStrictEqual(schema.indexes, schemas.humanWithSimpleAndCompoundIndexes.indexes);
            });
        });
        describe('.create()', () => {
            describe('positive', () => {
                it('create human', () => {
                    const schema = createRxSchema(schemas.human);
                    assert.strictEqual(schema.constructor.name, 'RxSchema');
                });
                it('create nested', () => {
                    const schema = createRxSchema(schemas.nestedHuman);
                    assert.strictEqual(schema.constructor.name, 'RxSchema');
                });
                it('create point', () => {
                    const schema = createRxSchema(schemas.point);
                    assert.strictEqual(schema.constructor.name, 'RxSchema');
                });
                it('should have indexes human', () => {
                    const schema = createRxSchema(schemas.human);
                    assert.strictEqual(schema.indexes[0][0], 'passportId');
                });
            });
            describe('negative', () => {
                it('broken schema (nostringIndex)', () => {
                    assert.throws(() => createRxSchema(schemas.noStringIndex), Error);
                });
                it('first-level field is "language" is forbitten', () => {
                    assert.throws(() => createRxSchema({
                        title: 'schema',
                        version: 0,
                        description: 'dot in fieldname',
                        type: 'object',
                        properties: {
                            foo: {
                                type: 'string'
                            },
                            language: {
                                type: 'string'
                            }
                        }
                    }), Error);
                });
            });
        });
        describe('.getFinalFields()', () => {
            it('should contain the field', () => {
                const ret = getFinalFields({
                    version: 0,
                    type: 'object',
                    properties: {
                        myField: {
                            type: 'string',
                            final: true
                        }
                    }
                });
                assert.ok(ret.includes('myField'));
            });
            it('should contain the primary', () => {
                const ret = getFinalFields({
                    version: 0,
                    type: 'object',
                    properties: {
                        myField: {
                            type: 'string',
                            primary: true
                        }
                    }
                });
                assert.deepStrictEqual(ret, ['myField']);
            });
        });
    });
    describe('instance', () => {
        describe('.normalized', () => {
            it('should normalize if schema has not been normalized yet', () => {
                const schema = createRxSchema(schemas.humanNormalizeSchema1);
                const normalized = schema.normalized;
                assert.notStrictEqual(normalized, null);
            });
        });
        describe('.getPreviousVersions()', () => {
            it('get empty array when current==0', () => {
                const schema = createRxSchema({
                    title: 'schema',
                    version: 0,
                    type: 'object',
                    properties: {
                        'foobar': {
                            type: 'string'
                        }
                    }
                });
                assert.deepStrictEqual(
                    getPreviousVersions(schema.jsonSchema),
                    []
                );
            });
            it('get valid array when current==5', () => {
                const schema = createRxSchema({
                    title: 'schema',
                    version: 5,
                    type: 'object',
                    properties: {
                        'foobar': {
                            type: 'string'
                        }
                    }
                });
                assert.deepStrictEqual(
                    getPreviousVersions(schema.jsonSchema),
                    [0, 1, 2, 3, 4]
                );
            });
        });
        describe('.hash', () => {
            describe('positive', () => {
                it('should hash', () => {
                    const schema = createRxSchema(schemas.human);
                    const hash = schema.hash;
                    assert.strictEqual(typeof hash, 'string');
                    assert.ok(hash.length > 10);
                });
                it('should normalize one schema with two different orders and generate for each the same hash', () => {
                    const schema1 = createRxSchema(schemas.humanNormalizeSchema1);
                    const schema2 = createRxSchema(schemas.humanNormalizeSchema2);
                    const hash1 = schema1.hash;
                    const hash2 = schema2.hash;
                    assert.strictEqual(hash1, hash2);
                });
            });
        });
        describe('.validate()', () => {
            describe('positive', () => {
                it('validate one human', () => {
                    const schema = createRxSchema(schemas.human);
                    const obj: any = schemaObjects.human();
                    obj['_id'] = generateId();
                    schema.validate(obj);
                });
                it('validate one point', () => {
                    const schema = createRxSchema(schemas.point);
                    const obj: any = schemaObjects.point();
                    obj['_id'] = generateId();
                    schema.validate(obj);
                });
                it('validate without non-required', () => {
                    const schema = createRxSchema(schemas.human);
                    const obj: any = schemaObjects.human();
                    obj['_id'] = generateId();
                    delete obj.age;
                    schema.validate(obj);
                });
                it('validate nested', () => {
                    const schema = createRxSchema(schemas.nestedHuman);
                    const obj: any = schemaObjects.nestedHuman();
                    obj['_id'] = generateId();
                    schema.validate(obj);
                });
            });
            describe('negative', () => {
                it('required field not given', () => {
                    const schema = createRxSchema(schemas.human);
                    const obj: any = schemaObjects.human();
                    obj['_id'] = generateId();
                    delete obj.lastName;
                    assert.throws(() => schema.validate(obj), Error);
                });
                it('overflow maximum int', () => {
                    const schema = createRxSchema(schemas.human);
                    const obj: any = schemaObjects.human();
                    obj['_id'] = generateId();
                    obj.age = 1000;
                    assert.throws(() => schema.validate(obj), Error);
                });
                it('overadditional property', () => {
                    const schema = createRxSchema(schemas.human);
                    const obj: any = schemaObjects.human();
                    obj['_id'] = generateId();
                    obj['token'] = randomCouchString(5);
                    assert.throws(() => schema.validate(obj), Error);
                });
                it('::after', () => {
                    const schema = createRxSchema(schemas.human);
                    const obj: any = schemaObjects.human();
                    obj['_id'] = generateId();
                    schema.validate(obj);
                });
                it('accessible error-parameters', () => {
                    const schema = createRxSchema(schemas.human);
                    const obj = schemaObjects.human();
                    let hasThrown = false;
                    try {
                        schema.validate(obj);
                    } catch (err) {
                        const deepParam = err.parameters.errors[0].field;
                        assert.strictEqual(deepParam, 'data._id');
                        hasThrown = true;
                    }
                    assert.ok(hasThrown);
                });
                it('should respect nested additionalProperties: false', () => {
                    const jsonSchema: any = clone(schemas.heroArray);
                    jsonSchema.properties.skills.items['additionalProperties'] = false;
                    const schema = createRxSchema(jsonSchema);
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

                    let hasThrown = false;
                    try {
                        schema.validate(obj);
                    } catch (err) {
                        const message = err.parameters.errors[0].message;
                        assert.strictEqual(message, 'has additional properties');
                        hasThrown = true;
                    }
                    assert.ok(hasThrown);
                });
                it('final fields should be required', () => {
                    const schema = createRxSchema(schemas.humanFinal);
                    let hasThrown = false;
                    const obj = {
                        passportId: 'foobar',
                        firstName: 'foo',
                        lastName: 'bar'
                    };
                    try {
                        schema.validate(obj);
                    } catch (err) {
                        const deepParam = err.parameters.errors[0].field;
                        assert.strictEqual(deepParam, 'data.age');
                        hasThrown = true;
                    }
                    assert.ok(hasThrown);
                });
                it('should show fields with undefined in the error-params', () => {
                    const schema = createRxSchema(schemas.humanFinal);
                    let error = null;
                    try {
                        schema.validate({
                            foo: 'bar',
                            noval: undefined,
                            nr: 7
                        });
                    } catch (err) {
                        error = err;
                    }
                    assert.ok(error);
                    assert.deepStrictEqual(error.parameters.obj.noval, undefined);
                    const text = error.toString();
                    assert.ok(text.includes('noval'));
                });
            });
        });
        describe('.validateChange()', () => {
            describe('positive', () => {
                it('should allow a valid change', () => {
                    const schema = createRxSchema(schemas.human);
                    const dataBefore = schemaObjects.human();
                    const dataAfter = clone(dataBefore);
                    dataAfter.age = 100;

                    schema.validateChange(dataBefore, dataAfter);
                });
            });
            describe('negative', () => {
                it('should not allow to change the primary', async () => {
                    const schema = createRxSchema(schemas.primaryHuman);
                    const dataBefore = schemaObjects.human();
                    const dataAfter = clone(dataBefore);
                    dataAfter.passportId = 'foobar';

                    await AsyncTestUtil.assertThrows(
                        () => schema.validateChange(dataBefore, dataAfter),
                        'RxError',
                        'final'
                    );
                });
                it('should not allow to change a final field', async () => {
                    const schema = createRxSchema(schemas.humanFinal);
                    const dataBefore = schemaObjects.human();
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
                    const schema = createRxSchema(schemas.human);
                    const schemaObj = schema.getSchemaByObjectPath('passportId');
                    assert.strictEqual(schemaObj.type, 'string');
                });
                it('get deeper', () => {
                    const schema = createRxSchema(schemas.nestedHuman);
                    const schemaObj = schema.getSchemaByObjectPath('mainSkill');
                    assert.ok(schemaObj.properties);
                });
                it('get nested', () => {
                    const schema = createRxSchema(schemas.nestedHuman);
                    const schemaObj = schema.getSchemaByObjectPath('mainSkill.name');
                    assert.strictEqual(schemaObj.type, 'string');
                });
            });
            describe('negative', () => { });
        });
        describe('.fillObjectWithDefaults()', () => {
            describe('positive', () => {
                it('should fill all unset fields', () => {
                    const schema = createRxSchema(schemas.humanDefault);
                    const data = {
                        foo: 'bar'
                    };
                    const filled = schema.fillObjectWithDefaults(data);
                    assert.ok(data !== filled);
                    assert.strictEqual(filled.foo, 'bar');
                    assert.strictEqual(filled.age, 20);
                });
                it('should not overwrite given values', () => {
                    const schema = createRxSchema(schemas.humanDefault);
                    const data = {
                        foo: 'bar',
                        age: 40
                    };
                    const data2 = clone(data);
                    const filled = schema.fillObjectWithDefaults(data);
                    const filled2 = schema.fillObjectWithDefaults(data2);
                    assert.ok(data !== filled);
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
            const schema: RxJsonSchema = {
                version: 0,
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        primary: true
                    },
                    fileInfo: {
                        type: 'object',
                        properties: {
                            watch: {
                                type: 'object',
                                properties: {
                                    time: {
                                        type: 'number'
                                    }
                                }
                            }
                        },
                    },
                },
                indexes: ['fileInfo.watch.time']
            };
            const db = await createRxDatabase({
                name: randomCouchString(10),
                adapter: 'memory'
            });
            const col = await db.collection({
                name: 'items',
                schema
            });

            await col.insert({
                id: '1',
                fileInfo: {
                    watch: {
                        time: 1
                    }
                }
            });

            const query = col.find()
                .where('fileInfo.watch.time')
                .gt(-9999999999999999999999999999)
                .sort('fileInfo.watch.time');
            const found = await query.exec();
            assert.strictEqual(found.length, 1);
            assert.strictEqual(found[0].fileInfo.watch.time, 1);

            db.destroy();
        });
        it('#620 indexes should not be required', async () => {
            const mySchema: RxJsonSchema = {
                version: 0,
                type: 'object',
                properties: {
                    passportId: {
                        type: 'string',
                        primary: true
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
                    }
                },
                indexes: ['lastName']
            };
            // create a database
            const db = await createRxDatabase({
                name: randomCouchString(10),
                adapter: 'memory'
            });
            const collection = await db.collection({
                name: 'test',
                schema: mySchema
            });
            await collection.insert({
                passportId: 'foobar',
                firstName: 'Bob',
                age: 56
            });
            db.destroy();
        });
        it('#697 Indexes do not work in objects named "properties"', async () => {
            const mySchema: RxJsonSchema = {
                version: 0,
                type: 'object',
                properties: {
                    properties: {
                        type: 'object',
                        properties: {
                            name: {
                                type: 'string'
                            },
                            content: {
                                type: 'string'
                            }
                        }
                    },
                },
                indexes: ['properties.name', 'properties.content']
            };

            // create a database
            const db = await createRxDatabase({
                name: randomCouchString(10),
                adapter: 'memory'
            });
            const collection = await db.collection({
                name: 'test',
                schema: mySchema
            });

            await collection.insert({
                properties: {
                    name: 'Title',
                    content: 'Post content'
                }
            });

            db.destroy();
        });
        it('#697(2) should also work deep nested', async () => {
            const mySchema: RxJsonSchema = {
                version: 0,
                type: 'object',
                properties: {
                    properties: {
                        type: 'object',
                        properties: {
                            name: {
                                type: 'string'
                            },
                            properties: {
                                type: 'string'
                            }
                        }
                    },
                },
                indexes: ['properties.name', 'properties.properties']
            };

            // create a database
            const db = await createRxDatabase({
                name: randomCouchString(10),
                adapter: 'memory'
            });
            const collection = await db.collection({
                name: 'test',
                schema: mySchema
            });

            await collection.insert({
                properties: {
                    name: 'Title',
                    properties: 'Post content'
                }
            });

            assert.deepStrictEqual(
                [
                    ['properties.name'],
                    ['properties.properties']
                ],
                collection.schema.indexes
            );

            db.destroy();
        });
    });
    describe('wait a bit', () => {
        it('w8 a bit', async () => {
            await AsyncTestUtil.wait(0);
        });
    });
});
