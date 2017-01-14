import assert from 'assert';
import { default as sinon } from 'sinon';
import {
    default as randomToken
} from 'random-token';
import * as _ from 'lodash';

import * as RxSchema from '../../dist/lib/RxSchema';
import * as util from '../../dist/lib/util';
import * as schemas from '../helper/schemas';
import * as schemaObjects from '../helper/schema-objects';


process.on('unhandledRejection', function(err) {
    throw err;
});


const g = {};

describe('RxSchema.test.js', () => {
    describe('static', () => {
        describe('.getIndexes()', () => {
            it('get single indexes', () => {
                const indexes = RxSchema.getIndexes(schemas.human);
                assert.equal(indexes.length, 1);
                assert.equal(indexes[0], 'passportId');
            });
            it('get multiple indexes', () => {
                const indexes = RxSchema.getIndexes(schemas.bigHuman);
                assert.ok(indexes.length > 1);
                assert.equal(indexes[0], 'passportId');
            });
            it('get no index', () => {
                const indexes = RxSchema.getIndexes(schemas.noindexHuman);
                assert.equal(indexes.length, 0);
            });
            it('get compoundIndex', () => {
                const indexes = RxSchema.getIndexes(schemas.compoundIndex);
                assert.ok(_.isArray(indexes));
                assert.ok(_.isArray(indexes[0]));
                assert.equal(indexes[0].length, 2);
            });
        });
        describe('.checkSchema()', () => {
            describe('positive', () => {
                it('validate human', () => {
                    RxSchema.checkSchema(schemas.human);
                });
                it('validate bigHuman', () => {
                    RxSchema.checkSchema(schemas.bigHuman);
                });
                it('validate without index', () => {
                    RxSchema.checkSchema(schemas.noindexHuman);
                });
                it('validate with compoundIndexes', () => {
                    RxSchema.checkSchema(schemas.compoundIndex);
                });
                it('validate empty', () => {
                    RxSchema.checkSchema(schemas.empty);
                });

            });
            describe('negative', () => {
                it('break when index is no string', () => {
                    assert.throws(() => RxSchema.checkSchema(schemas.nostringIndex), Error);
                });
                it('break compoundIndex key is no string', () => {
                    assert.throws(() => RxSchema.checkSchema(schemas.compoundIndexNoString), Error);
                });
                it('break on wrong formated compundIndex', () => {
                    assert.throws(() => RxSchema.checkSchema(schemas.wrongCompoundFormat), Error);
                });
                it('break when dots in fieldname', () => {
                    assert.throws(() => RxSchema.checkSchema({
                        title: 'schema',
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
                    assert.throws(() => RxSchema.checkSchema({
                        title: 'schema',
                        description: 'dot in fieldname',
                        properties: {
                            'firstName$': {
                                type: 'string'
                            }
                        }
                    }), Error);
                    assert.throws(() => RxSchema.checkSchema({
                        title: 'schema',
                        description: '$ in fieldname',
                        properties: {
                            'first$Name': {
                                type: 'string'
                            }
                        }
                    }), Error);
                });
                it('should not allow $-char in nested fieldnames', () => {
                    assert.throws(() => RxSchema.checkSchema({
                        title: 'schema',
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
                    assert.throws(() => RxSchema.checkSchema({
                        title: 'schema',
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
                it('should not allow RxDocument-properties as top-fieldnames (own)', () => {
                    assert.throws(() => RxSchema.checkSchema({
                        title: 'schema',
                        description: 'changed as fieldname',
                        properties: {
                            'changed': {
                                type: 'string'
                            }
                        }
                    }), Error);
                });
                it('should not allow RxDocument-properties as top-fieldnames (prototype)', () => {
                    assert.throws(() => RxSchema.checkSchema({
                        title: 'schema',
                        description: 'save as fieldname',
                        properties: {
                            'save': {
                                type: 'string'
                            }
                        }
                    }), Error);
                });
            });
        });
        describe('.normalize()', () => {
            it('should be the same object', () => {
                let schema = RxSchema.normalize(schemas.humanNormalizeSchema1);
                assert.deepEqual(schema, schemas.humanNormalizeSchema1);
            });
            it('should deep sort one schema with different orders to be the same', () => {
                let schema1 = RxSchema.normalize(schemas.humanNormalizeSchema1);
                let schema2 = RxSchema.normalize(schemas.humanNormalizeSchema2);
                assert.equal(JSON.stringify(schema1), JSON.stringify(schema2));
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
                it('throw when nested index', () => {
                    assert.throws(() => RxSchema.create({
                        title: 'schema',
                        description: 'dot in fieldname',
                        properties: {
                            nested: {
                                type: 'object',
                                properties: {
                                    'otherfield': {
                                        type: 'string'
                                    },
                                    'myfield': {
                                        type: 'string',
                                        index: true
                                    }
                                }
                            }
                        }
                    }), Error);
                });
                it('first-level field is "language" is forbitten', () => {
                    assert.throws(() => RxSchema.create({
                        title: 'schema',
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
        describe('.normalized', ()=>{
          it('should normalize if schema has not been normalized yet', ()=>{
            let spy = sinon.spy()
            const schema = RxSchema.create(schemas.humanNormalizeSchema1);
            assert.equal(schema._normalized, null);
            const normalized = schema.normalized;
            throw new Error('asdlkasdjasd');
          })
        });
        describe('.hash()', () => {
            describe('positive', () => {
                it('should hash', () => {
                    const schema = RxSchema.create(schemas.human);
                    const hash = schema.hash();
                    assert.equal(typeof hash, 'string');
                    assert.ok(hash.length > 10);
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
                    obj.token = randomToken(5);
                    assert.throws(() => schema.validate(obj), Error);
                });
                it('::after', () => {
                    const schema = RxSchema.create(schemas.human);
                    const obj = schemaObjects.human();
                    obj._id = util.generate_id();
                    schema.validate(obj);
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

    });


    describe('wait a bit', () => {
        it('w8 a bit', (done) => {
            setTimeout(done, 1);
        });
    });
});
