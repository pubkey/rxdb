import assert from 'assert';
import * as _ from 'lodash';

import * as schemas from '../helper/schemas';
import * as schemaObjects from '../helper/schema-objects';
import * as humansCollection from '../helper/humans-collection';

import * as RxDatabase from '../../dist/lib/RxDatabase';
import * as RxSchema from '../../dist/lib/RxSchema';
import * as util from '../../dist/lib/util';

process.on('unhandledRejection', function(err) {
    throw err;
});

describe('Relation.test.js', () => {
    describe('RxSchema.create', () => {
        describe('positive', () => {
            it('should allow to create a schema with a relation', async() => {
                const schema = RxSchema.create({
                    version: 0,
                    properties: {
                        bestFriend: {
                            ref: 'human',
                            type: 'string'
                        }
                    }
                });
                assert.equal(schema.constructor.name, 'RxSchema');
            });
            it('should allow to create a schema with a relation in nested', async() => {
                const schema = RxSchema.create({
                    version: 0,
                    properties: {
                        foo: {
                            type: 'object',
                            properties: {
                                bestFriend: {
                                    ref: 'human',
                                    type: 'string'
                                }
                            }
                        }
                    }
                });
                assert.equal(schema.constructor.name, 'RxSchema');
            });
            it('should allow to create relation of array', async() => {
                const schema = RxSchema.create({
                    version: 0,
                    properties: {
                        friends: {
                            type: 'array',
                            items: {
                                ref: 'human',
                                type: 'string'
                            }
                        }
                    }
                });
                assert.equal(schema.constructor.name, 'RxSchema');
            });
        });
        describe('negative', () => {
            it('throw if primary is ref', () => {
                assert.throws(
                    () =>
                    RxSchema.create({
                        version: 0,
                        properties: {
                            bestFriend: {
                                primary: true,
                                ref: 'human',
                                type: 'string'
                            }
                        }
                    }),
                    Error
                );
            });
            it('throw if ref-type is no string', () => {
                assert.throws(
                    () =>
                    RxSchema.create({
                        version: 0,
                        properties: {
                            bestFriend: {
                                ref: 'human'
                            }
                        }
                    }),
                    Error
                );
            });
            it('throw if ref-type is no string (array)', () => {
                assert.throws(
                    () =>
                    RxSchema.create({
                        version: 0,
                        properties: {
                            friends: {
                                type: 'array',
                                items: {
                                    ref: 'human'
                                }
                            }
                        }
                    }),
                    Error
                );
            });
        });

    });



    describe('RxDocument() populate via pseudo-proxy', () => {
        describe('positive', () => {
            /*it('populate top-level-field', async() => {
                const col = await humansCollection.createRelated();
                const doc = await col.findOne().exec();
                const friend = await doc.bestFriend_;
                assert.equal(friend.constructor.name, 'RxDocument');
                assert.equal(friend.name, doc.bestFriend);
                col.database.destroy();
            });*/
        });
        describe('negative', () => {

//            it('e', () => process.exit());
        });
    });


});
