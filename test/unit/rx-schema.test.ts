import assert from 'assert';
import clone from 'clone';

import config from './config';
import * as util from '../../dist/lib/util';
import AsyncTestUtil from 'async-test-util';
import * as schemas from '../helper/schemas';
import * as schemaObjects from '../helper/schema-objects';

import * as SchemaCheck from '../../dist/lib/plugins/schema-check.js';

import RxDB from '../../';
import {
    createRxSchema
} from '../../';
import {
    RxSchema,
    getIndexes,
    normalize,
    hasCrypt,
    getFinalFields,
    getPreviousVersions
} from '../../dist/lib/rx-schema';

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
            });
            it('get sub-index', () => {
                const indexes = getIndexes(schemas.humanSubIndex);
                assert.strictEqual(indexes.length, 1);
                assert.deepStrictEqual(indexes[0], ['other.age']);
            });
            it('get no index', () => {
                const indexes = getIndexes(schemas.noindexHuman);
                assert.strictEqual(indexes.length, 0);
            });
            it('get compoundIndex', () => {
                const indexes = getIndexes(schemas.compoundIndex);
                assert.ok(Array.isArray(indexes));
                assert.ok(Array.isArray(indexes[0]));
                assert.deepStrictEqual(indexes[0], ['passportId', 'passportCountry']);
            });
        });
        describe('.checkSchema()', () => {
            describe('positive', () => {
                it('validate human', () => {
                    SchemaCheck.checkSchema(schemas.human);
                });
                it('validate bigHuman', () => {
                    SchemaCheck.checkSchema(schemas.bigHuman);
                });
                it('validate without index', () => {
                    SchemaCheck.checkSchema(schemas.noindexHuman);
                });
                it('validate with compoundIndexes', () => {
                    SchemaCheck.checkSchema(schemas.compoundIndex);
                });
                it('validate empty', () => {
                    SchemaCheck.checkSchema(schemas.empty);
                });
                it('validate with defaults', () => {
                    SchemaCheck.checkSchema(schemas.humanDefault);
                });
                it('validate point', () => {
                    SchemaCheck.checkSchema(schemas.point);
                });
                it('validate _id when primary', async () => {
                    SchemaCheck.checkSchema({
                        title: 'schema',
                        version: 0,
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
            });
            describe('negative', () => {
                it('break when index is no string', () => {
                    assert.throws(() => SchemaCheck.checkSchema(schemas.nostringIndex), Error);
                });
                it('break compoundIndex key is no string', () => {
                    assert.throws(() => SchemaCheck.checkSchema(schemas.compoundIndexNoString), Error);
                });
                it('break on wrong formated compundIndex', () => {
                    assert.throws(() => SchemaCheck.checkSchema(schemas.wrongCompoundFormat), Error);
                });
                it('break when dots in fieldname', () => {
                    assert.throws(() => SchemaCheck.checkSchema({
                        title: 'schema',
                        version: 0,
                        description: 'dot in fieldname',
                        properties: {
                            'my.field': {
                                type: 'string'
                            }
                        }
                    }), Error);
                });
                it('break when required is set via required: true', () => {
                    assert.throws(() => SchemaCheck.checkSchema({
                        title: 'schema',
                        version: 0,
                        description: 'dot in fieldname',
                        properties: {
                            'myfield': {
                                type: 'string',
                                required: true
                            }
                        }
                    }), Error);
                });

                /**
                 * things to make sure there a no conflicts with the RxDocument-proxy
                 */
                it('should not allow $-char in fieldnames', () => {
                    assert.throws(() => SchemaCheck.checkSchema({
                        title: 'schema',
                        version: 0,
                        description: 'dot in fieldname',
                        properties: {
                            'firstName$': {
                                type: 'string'
                            }
                        }
                    }), Error);
                    assert.throws(() => SchemaCheck.checkSchema({
                        title: 'schema',
                        version: 0,
                        description: '$ in fieldname',
                        properties: {
                            'first$Name': {
                                type: 'string'
                            }
                        }
                    }), Error);
                });
                it('should not allow $-char in nested fieldnames', () => {
                    assert.throws(() => SchemaCheck.checkSchema({
                        title: 'schema',
                        version: 0,
                        description: '$ in nested fieldname',
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
                    assert.throws(() => SchemaCheck.checkSchema({
                        title: 'schema',
                        version: 0,
                        description: '$ in nested fieldname',
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
                    assert.throws(() => SchemaCheck.checkSchema({
                        title: 'schema',
                        version: 0,
                        description: '_ in fieldname',
                        properties: {
                            'firstName_': {
                                type: 'string'
                            }
                        }
                    }), Error, 'underscore');
                    // nested
                    assert.throws(() => SchemaCheck.checkSchema({
                        title: 'schema',
                        version: 0,
                        description: 'dot in fieldname',
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
                    assert.throws(() => SchemaCheck.checkSchema({
                        title: 'schema',
                        version: 0,
                        description: 'collection as fieldname',
                        properties: {
                            'collection': {
                                type: 'string'
                            }
                        }
                    }), Error);
                });
                it('should not allow RxDocument-properties as top-fieldnames (prototype)', () => {
                    assert.throws(() => SchemaCheck.checkSchema({
                        title: 'schema',
                        version: 0,
                        description: 'save as fieldname',
                        properties: {
                            'save': {
                                type: 'string'
                            }
                        }
                    }), Error);
                });
                it('throw when no version', () => {
                    assert.throws(() => SchemaCheck.checkSchema({
                        title: 'schema',
                        description: 'save as fieldname',
                        properties: {
                            'foobar': {
                                type: 'string'
                            }
                        }
                    }), Error);
                });
                it('throw when version < 0', () => {
                    assert.throws(() => SchemaCheck.checkSchema({
                        title: 'schema',
                        version: -10,
                        description: 'save as fieldname',
                        properties: {
                            'foobar': {
                                type: 'string'
                            }
                        }
                    }), Error);
                });
                it('throw when version no number', () => {
                    assert.throws(() => SchemaCheck.checkSchema({
                        title: 'schema',
                        version: 'foobar',
                        description: 'save as fieldname',
                        properties: {
                            'foobar': {
                                type: 'string'
                            }
                        }
                    }), Error);
                });
                it('throw when defaults on non-first-level field', async () => {
                    assert.throws(() => SchemaCheck.checkSchema({
                        title: 'schema',
                        version: 0,
                        description: 'save as fieldname',
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
                                    }
                                }
                            }
                        }
                    }), Error);
                });
                it('throw when _id is not primary', async () => {
                    assert.throws(() => SchemaCheck.checkSchema({
                        title: 'schema',
                        version: 0,
                        description: 'save as fieldname',
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
                const normalized = util.sortObject(val);
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
                    assert.throws(() => createRxSchema(schemas.nostringIndex), Error);
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
        describe('.hasCrypt()', () => {
            describe('positive', () => {
                it('true when one field is encrypted', () => {
                    const ret = hasCrypt({
                        version: 0,
                        type: 'object',
                        properties: {
                            secret: {
                                type: 'string',
                                encrypted: true
                            }
                        }
                    });
                    assert.strictEqual(ret, true);
                });
                it('false when no field is encrypted', () => {
                    const ret = hasCrypt({
                        version: 0,
                        type: 'object',
                        properties: {
                            secret: {
                                type: 'string'
                            }
                        }
                    });
                    assert.strictEqual(ret, false);
                });
                it('true when nested field is encrypted', () => {
                    const ret = hasCrypt({
                        version: 0,
                        type: 'object',
                        properties: {
                            any: {
                                type: 'object',
                                properties: {
                                    secret: {
                                        type: 'string',
                                        encrypted: true
                                    }
                                }
                            }
                        }
                    });
                    assert.strictEqual(ret, true);
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
            it('should contain the primary', async () => {
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
                assert.notStrictEqual(schema._normalized, null);
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
                    getPreviousVersions(schema.jsonID),
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
                    getPreviousVersions(schema.jsonID),
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
                    obj['_id'] = util.generateId();
                    schema.validate(obj);
                });
                it('validate one point', () => {
                    const schema = createRxSchema(schemas.point);
                    const obj: any = schemaObjects.point();
                    obj['_id'] = util.generateId();
                    schema.validate(obj);
                });
                it('validate without non-required', () => {
                    const schema = createRxSchema(schemas.human);
                    const obj: any = schemaObjects.human();
                    obj['_id'] = util.generateId();
                    delete obj.age;
                    schema.validate(obj);
                });
                it('validate nested', () => {
                    const schema = createRxSchema(schemas.nestedHuman);
                    const obj: any = schemaObjects.nestedHuman();
                    obj['_id'] = util.generateId();
                    schema.validate(obj);
                });
            });
            describe('negative', () => {
                it('required field not given', () => {
                    const schema = createRxSchema(schemas.human);
                    const obj: any = schemaObjects.human();
                    obj['_id'] = util.generateId();
                    delete obj.lastName;
                    assert.throws(() => schema.validate(obj), Error);
                });
                it('overflow maximum int', () => {
                    const schema = createRxSchema(schemas.human);
                    const obj: any = schemaObjects.human();
                    obj['_id'] = util.generateId();
                    obj.age = 1000;
                    assert.throws(() => schema.validate(obj), Error);
                });
                it('overadditional property', () => {
                    const schema = createRxSchema(schemas.human);
                    const obj: any = schemaObjects.human();
                    obj['_id'] = util.generateId();
                    obj['token'] = util.randomCouchString(5);
                    assert.throws(() => schema.validate(obj), Error);
                });
                it('::after', () => {
                    const schema = createRxSchema(schemas.human);
                    const obj: any = schemaObjects.human();
                    obj['_id'] = util.generateId();
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
                it('should show fields with undefined in the error-params', async () => {
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
                it('should allow a valid change', async () => {
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
                it('get firstLevel', async () => {
                    const schema = createRxSchema(schemas.human);
                    const schemaObj = schema.getSchemaByObjectPath('passportId');
                    assert.strictEqual(schemaObj.index, true);
                    assert.strictEqual(schemaObj.type, 'string');
                });
                it('get deeper', async () => {
                    const schema = createRxSchema(schemas.nestedHuman);
                    const schemaObj = schema.getSchemaByObjectPath('mainSkill');
                    assert.ok(schemaObj.properties);
                });
                it('get nested', async () => {
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
            const schema = {
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
                                        type: 'number',
                                        index: true
                                    }
                                }
                            }
                        },
                    },
                }
            };
            const db = await RxDB.create({
                name: util.randomCouchString(10),
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

            const found = await col.find().where('fileInfo.watch.time').gt(-9999999999999999999999999999).sort('fileInfo.watch.time').exec();
            assert.strictEqual(found.length, 1);
            assert.strictEqual(found[0].fileInfo.watch.time, 1);

            db.destroy();
        });
        it('#620 indexes should not be required', async () => {
            const mySchema = {
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
                        type: 'string',
                        index: true
                    },
                    age: {
                        type: 'integer',
                        minimum: 0,
                        maximum: 150
                    }
                }
            };
            // create a database
            const db = await RxDB.create({
                name: util.randomCouchString(10),
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
            const mySchema = {
                version: 0,
                id: 'post',
                type: 'object',
                properties: {
                    properties: {
                        type: 'object',
                        properties: {
                            name: {
                                type: 'string',
                                index: true,
                            },
                            content: {
                                type: 'string',
                                index: true,
                            }
                        }
                    },
                },
            };

            // create a database
            const db = await RxDB.create({
                name: util.randomCouchString(10),
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
            const mySchema = {
                version: 0,
                id: 'post',
                type: 'object',
                properties: {
                    properties: {
                        type: 'object',
                        properties: {
                            name: {
                                type: 'string',
                                index: true,
                            },
                            properties: {
                                type: 'string',
                                index: true,
                            }
                        }
                    },
                },
            };

            // create a database
            const db = await RxDB.create({
                name: util.randomCouchString(10),
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
