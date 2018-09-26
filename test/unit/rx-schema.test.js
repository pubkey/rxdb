import assert from 'assert';
import clone from 'clone';

import config from './config';
import * as RxSchema from '../../dist/lib/rx-schema';
import * as util from '../../dist/lib/util';
import AsyncTestUtil from 'async-test-util';
import * as schemas from '../helper/schemas';
import * as schemaObjects from '../helper/schema-objects';

import * as SchemaCheck from '../../dist/lib/plugins/schema-check.js';

import RxDB from '../../dist/lib/';

config.parallel('rx-schema.test.js', () => {
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
                it('create point', () => {
                    const schema = RxSchema.create(schemas.point);
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
        describe('.getFinalFields()', () => {
            it('should contain the field', () => {
                const ret = RxSchema.getFinalFields({
                    version: 0,
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
                const ret = RxSchema.getFinalFields({
                    version: 0,
                    properties: {
                        myField: {
                            type: 'string',
                            primary: true
                        }
                    }
                });
                assert.deepEqual(ret, ['myField']);
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
                    obj._id = util.generateId();
                    schema.validate(obj);
                });
                it('validate one point', () => {
                    const schema = RxSchema.create(schemas.point);
                    const obj = schemaObjects.point();
                    obj._id = util.generateId();
                    schema.validate(obj);
                });
                it('validate without non-required', () => {
                    const schema = RxSchema.create(schemas.human);
                    const obj = schemaObjects.human();
                    obj._id = util.generateId();
                    delete obj.age;
                    schema.validate(obj);
                });
                it('validate nested', () => {
                    const schema = RxSchema.create(schemas.nestedHuman);
                    const obj = schemaObjects.nestedHuman();
                    obj._id = util.generateId();
                    schema.validate(obj);
                });
            });
            describe('negative', () => {
                it('required field not given', () => {
                    const schema = RxSchema.create(schemas.human);
                    const obj = schemaObjects.human();
                    obj._id = util.generateId();
                    delete obj.lastName;
                    assert.throws(() => schema.validate(obj), Error);
                });
                it('overflow maximum int', () => {
                    const schema = RxSchema.create(schemas.human);
                    const obj = schemaObjects.human();
                    obj._id = util.generateId();
                    obj.age = 1000;
                    assert.throws(() => schema.validate(obj), Error);
                });
                it('overadditional property', () => {
                    const schema = RxSchema.create(schemas.human);
                    const obj = schemaObjects.human();
                    obj._id = util.generateId();
                    obj.token = util.randomCouchString(5);
                    assert.throws(() => schema.validate(obj), Error);
                });
                it('::after', () => {
                    const schema = RxSchema.create(schemas.human);
                    const obj = schemaObjects.human();
                    obj._id = util.generateId();
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
                it('final fields should be required', () => {
                    const schema = RxSchema.create(schemas.humanFinal);
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
                        assert.equal(deepParam, 'data.age');
                        hasThrown = true;
                    }
                    assert.ok(hasThrown);
                });
                it('should show fields with undefined in the error-params', async () => {
                    const schema = RxSchema.create(schemas.humanFinal);
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
                    assert.deepEqual(error.parameters.obj.noval, undefined);
                    const text = error.toString();
                    assert.ok(text.includes('noval'));
                });
            });
        });
        describe('.validateChange()', () => {
            describe('positive', () => {
                it('should allow a valid change', async () => {
                    const schema = RxSchema.create(schemas.human);
                    const dataBefore = schemaObjects.human();
                    const dataAfter = clone(dataBefore);
                    dataAfter.age = 100;

                    schema.validateChange(dataBefore, dataAfter);
                });
            });
            describe('negative', () => {
                it('should not allow to change the primary', async () => {
                    const schema = RxSchema.create(schemas.primaryHuman);
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
                    const schema = RxSchema.create(schemas.humanFinal);
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
                    const schema = RxSchema.create(schemas.human);
                    const schemaObj = schema.getSchemaByObjectPath('passportId');
                    assert.equal(schemaObj.index, true);
                    assert.equal(schemaObj.type, 'string');
                });
                it('get deeper', async () => {
                    const schema = RxSchema.create(schemas.nestedHuman);
                    const schemaObj = schema.getSchemaByObjectPath('mainSkill');
                    assert.ok(schemaObj.properties);
                });
                it('get nested', async () => {
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
                    assert.ok(data !== filled);
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
                    assert.ok(data !== filled);
                    assert.equal(filled.foo, 'bar');
                    assert.equal(filled.age, 40);
                    assert.equal(filled2.foo, 'bar');
                    assert.equal(filled2.age, 40);
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
            assert.equal(found.length, 1);
            assert.equal(found[0].fileInfo.watch.time, 1);

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

            assert.deepEqual(
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
