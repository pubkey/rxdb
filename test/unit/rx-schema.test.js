import assert from 'assert';
import clone from 'clone';

import * as RxSchema from '../../dist/lib/rx-schema';
import * as util from '../../dist/lib/util';
import AsyncTestUtil from 'async-test-util';
import * as schemas from '../helper/schemas';
import * as schemaObjects from '../helper/schema-objects';

import * as SchemaCheck from '../../dist/lib/modules/schema-check.js';

describe('rx-schema.test.js', () => {
    describe('static', () => {
        describe('.getIndexes()', () => {
            it('get single indexes', () => {
                const indexes = RxSchema.getIndexes(schemas.human);
                assert.equal(indexes.length, 1);
                assert.deepEqual(indexes[0], ['passportId']);
            });
            it('get multiple indexes', () => {
                const indexes = RxSchema.getIndexes(schemas.bigHuman);
                assert.ok(indexes.length > 1);
                assert.deepEqual(indexes[0], ['passportId']);
            });
            it('get sub-index', () => {
                const indexes = RxSchema.getIndexes(schemas.humanSubIndex);
                assert.equal(indexes.length, 1);
                assert.deepEqual(indexes[0], ['other.age']);
            });
            it('get no index', () => {
                const indexes = RxSchema.getIndexes(schemas.noindexHuman);
                assert.equal(indexes.length, 0);
            });
            it('get compoundIndex', () => {
                const indexes = RxSchema.getIndexes(schemas.compoundIndex);
                assert.ok(Array.isArray(indexes));
                assert.ok(Array.isArray(indexes[0]));
                assert.deepEqual(indexes[0], ['passportId', 'passportCountry']);
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
                                        type: string
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
                                        type: string
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
                it('throw when defaults on non-first-level field', async() => {
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
            });
        });
        describe('.normalize()', () => {
            it('should sort array with objects and strings', () => {
                const val = ['firstName', 'lastName', {
                    name: 2
                }];
                const normalized = RxSchema.normalize(val);
                assert.deepEqual(val, normalized);
            });
            it('should be the same object', () => {
                const schema = RxSchema.normalize(schemas.humanNormalizeSchema1);
                assert.deepEqual(schema, schemas.humanNormalizeSchema1);
            });
            it('should deep sort one schema with different orders to be the same', () => {
                const schema1 = RxSchema.normalize(schemas.humanNormalizeSchema1);
                const schema2 = RxSchema.normalize(schemas.humanNormalizeSchema2);
                assert.deepEqual(schema1, schema2);
            });
        });
        describe('.create()', () => {
            describe('positive', () => {
                it('create human', () => {
                    const schema = RxSchema.create(schemas.human);
                    assert.equal(schema.constructor.name, 'RxSchema');
                });
                it('create nested', () => {
                    const schema = RxSchema.create(schemas.nestedHuman);
                    assert.equal(schema.constructor.name, 'RxSchema');
                });
                it('should have indexes human', () => {
                    const schema = RxSchema.create(schemas.human);
                    assert.equal(schema.indexes[0], 'passportId');
                });

            });
            describe('negative', () => {
                it('broken schema (nostringIndex)', () => {
                    assert.throws(() => RxSchema.create(schemas.nostringIndex), Error);
                });
                it('first-level field is "language" is forbitten', () => {
                    assert.throws(() => RxSchema.create({
                        title: 'schema',
                        version: 0,
                        description: 'dot in fieldname',
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
                    const ret = RxSchema.hasCrypt({
                        version: 0,
                        properties: {
                            secret: {
                                type: 'string',
                                encrypted: true
                            }
                        }
                    });
                    assert.equal(ret, true);
                });
                it('false when no field is encrypted', () => {
                    const ret = RxSchema.hasCrypt({
                        version: 0,
                        properties: {
                            secret: {
                                type: 'string'
                            }
                        }
                    });
                    assert.equal(ret, false);
                });
                it('true when nested field is encrypted', () => {
                    const ret = RxSchema.hasCrypt({
                        version: 0,
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
                    assert.equal(ret, true);
                });
            });
        });
    });
    describe('instance', () => {
        describe('.normalized', () => {
            it('should normalize if schema has not been normalized yet', () => {
                const schema = RxSchema.create(schemas.humanNormalizeSchema1);
                const normalized = schema.normalized;
                assert.notEqual(schema._normalized, null);
                assert.notEqual(normalized, null);
            });
        });
        describe('.previousVersions', () => {
            it('get empty array when current==0', () => {
                const schema = RxSchema.create({
                    title: 'schema',
                    version: 0,
                    properties: {
                        'foobar': {
                            type: 'string'
                        }
                    }
                });
                assert.deepEqual(schema.previousVersions, []);
            });
            it('get valid array when current==5', () => {
                const schema = RxSchema.create({
                    title: 'schema',
                    version: 5,
                    properties: {
                        'foobar': {
                            type: 'string'
                        }
                    }
                });
                assert.deepEqual(schema.previousVersions, [0, 1, 2, 3, 4]);
            });
        });
        describe('.hash', () => {
            describe('positive', () => {
                it('should hash', () => {
                    const schema = RxSchema.create(schemas.human);
                    const hash = schema.hash;
                    assert.equal(typeof hash, 'string');
                    assert.ok(hash.length > 10);
                });
                it('should normalize one schema with two different orders and generate for each the same hash', () => {
                    const schema1 = RxSchema.create(schemas.humanNormalizeSchema1);
                    const schema2 = RxSchema.create(schemas.humanNormalizeSchema2);
                    const hash1 = schema1.hash;
                    const hash2 = schema2.hash;
                    assert.equal(hash1, hash2);
                });
            });
        });
        describe('.validate()', () => {
            describe('positive', () => {
                it('validate one human', () => {
                    const schema = RxSchema.create(schemas.human);
                    const obj = schemaObjects.human();
                    obj._id = util.generate_id();
                    schema.validate(obj);
                });
                it('validate without non-required', () => {
                    const schema = RxSchema.create(schemas.human);
                    const obj = schemaObjects.human();
                    obj._id = util.generate_id();
                    delete obj.age;
                    schema.validate(obj);
                });
                it('validate nested', () => {
                    const schema = RxSchema.create(schemas.nestedHuman);
                    const obj = schemaObjects.nestedHuman();
                    obj._id = util.generate_id();
                    schema.validate(obj);
                });
            });
            describe('negative', () => {
                it('index not given', () => {
                    const schema = RxSchema.create(schemas.human);
                    const obj = schemaObjects.human();
                    obj._id = util.generate_id();
                    delete obj.passportId;
                    assert.throws(() => schema.validate(obj), Error);
                });
                it('required field not given', () => {
                    const schema = RxSchema.create(schemas.human);
                    const obj = schemaObjects.human();
                    obj._id = util.generate_id();
                    delete obj.lastName;
                    assert.throws(() => schema.validate(obj), Error);
                });
                it('overflow maximum int', () => {
                    const schema = RxSchema.create(schemas.human);
                    const obj = schemaObjects.human();
                    obj._id = util.generate_id();
                    obj.age = 1000;
                    assert.throws(() => schema.validate(obj), Error);
                });
                it('overadditional property', () => {
                    const schema = RxSchema.create(schemas.human);
                    const obj = schemaObjects.human();
                    obj._id = util.generate_id();
                    obj.token = util.randomCouchString(5);
                    assert.throws(() => schema.validate(obj), Error);
                });
                it('::after', () => {
                    const schema = RxSchema.create(schemas.human);
                    const obj = schemaObjects.human();
                    obj._id = util.generate_id();
                    schema.validate(obj);
                });
                it('accessible error-parameters', () => {
                    const schema = RxSchema.create(schemas.human);
                    const obj = schemaObjects.human();
                    let hasThrown = false;
                    try {
                        schema.validate(obj);
                    } catch (err) {
                        const deepParam = err.parameters.errors[0].field;
                        assert.equal(deepParam, 'data._id');
                        hasThrown = true;
                    }
                    assert.ok(hasThrown);
                });
            });
        });
        describe('.getSchemaByObjectPath()', () => {
            describe('positive', () => {
                it('get firstLevel', async() => {
                    const schema = RxSchema.create(schemas.human);
                    const schemaObj = schema.getSchemaByObjectPath('passportId');
                    assert.equal(schemaObj.index, true);
                    assert.equal(schemaObj.type, 'string');
                });
                it('get deeper', async() => {
                    const schema = RxSchema.create(schemas.nestedHuman);
                    const schemaObj = schema.getSchemaByObjectPath('mainSkill');
                    assert.ok(schemaObj.properties);
                });
                it('get nested', async() => {
                    const schema = RxSchema.create(schemas.nestedHuman);
                    const schemaObj = schema.getSchemaByObjectPath('mainSkill.name');
                    assert.equal(schemaObj.type, 'string');
                });
            });
            describe('negative', () => {});
        });
        describe('.fillObjectWithDefaults()', () => {
            describe('positive', () => {
                it('should fill all unset fields', () => {
                    const schema = RxSchema.create(schemas.humanDefault);
                    const data = {
                        foo: 'bar'
                    };
                    const filled = schema.fillObjectWithDefaults(data);
                    assert.ok(data != filled);
                    assert.equal(filled.foo, 'bar');
                    assert.equal(filled.age, 20);
                });
                it('should not overwrite given values', () => {
                    const schema = RxSchema.create(schemas.humanDefault);
                    const data = {
                        foo: 'bar',
                        age: 40
                    };
                    const data2 = clone(data);
                    const filled = schema.fillObjectWithDefaults(data);
                    const filled2 = schema.fillObjectWithDefaults(data2);
                    assert.ok(data != filled);
                    assert.equal(filled.foo, 'bar');
                    assert.equal(filled.age, 40);
                    assert.equal(filled2.foo, 'bar');
                    assert.equal(filled2.age, 40);
                });
            });
        });
    });
    describe('performance', () => {
        it('validate object often', async() => {
            return; // comment out to run speed-test
            const schema = RxSchema.create(schemas.human);
            const obj = schemaObjects.human();
            obj._id = util.randomCouchString(10);

            console.dir(obj);
            console.time('t1');
            for (let i = 0; i < 5000; i++)
                schema.validate(obj);

            console.timeEnd('t1');
            process.exit();
        });
    });
    describe('wait a bit', () => {
        it('w8 a bit', async() => {
            await AsyncTestUtil.wait(0);
        });
    });
});
