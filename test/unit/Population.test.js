import assert from 'assert';
import * as faker from 'faker';

import * as schemas from '../helper/schemas';
import * as schemaObjects from '../helper/schema-objects';
import * as humansCollection from '../helper/humans-collection';

import * as RxDatabase from '../../dist/lib/RxDatabase';
import * as RxSchema from '../../dist/lib/RxSchema';
import * as RxDocument from '../../dist/lib/RxDocument';
import * as util from '../../dist/lib/util';
import AsyncTestUtil from 'async-test-util';


describe('Population.test.js', () => {
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
                    () => RxSchema.create({
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
                    () => RxSchema.create({
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
                    () => RxSchema.create({
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
    describe('RxDocument().populate()', () => {
        describe('positive', () => {
            it('populate top-level-field', async() => {
                const col = await humansCollection.createRelated();
                const doc = await col.findOne().exec();
                const friend = await doc.populate('bestFriend');
                assert.equal(friend.constructor.name, 'RxDocument');
                assert.equal(friend.name, doc.bestFriend);
                col.database.destroy();
            });
            it('populate nested field', async() => {
                const col = await humansCollection.createRelatedNested();
                const doc = await col.findOne().exec();
                const friend = await doc.populate('foo.bestFriend');
                assert.equal(friend.constructor.name, 'RxDocument');
                assert.equal(friend.name, doc.foo.bestFriend);
                col.database.destroy();
            });
            it('populate string-array', async() => {
                const db = await RxDatabase.create({
                    name: util.randomCouchString(10),
                    adapter: 'memory'
                });
                const col = await db.collection({
                    name: 'human',
                    schema: {
                        version: 0,
                        type: 'object',
                        properties: {
                            name: {
                                type: 'string',
                                primary: true
                            },
                            friends: {
                                type: 'array',
                                ref: 'human',
                                items: {
                                    type: 'string'
                                }
                            }
                        }
                    }
                });
                const friends = new Array(5).fill(0).map(() => {
                    return {
                        name: faker.name.firstName(),
                        friends: []
                    };
                });
                await Promise.all(friends.map(friend => col.insert(friend)));
                const oneGuy = {
                    name: 'Piotr',
                    friends: friends.map(friend => friend.name)
                };
                await col.insert(oneGuy);
                const doc = await col.findOne(oneGuy.name).exec();
                const friendDocs = await doc.friends_;
                friendDocs.forEach(friend => {
                    assert.equal(friend.constructor.name, 'RxDocument');
                });
            });
        });
    });
    describe('RxDocument populate via pseudo-proxy', () => {
        describe('positive', () => {
            it('populate top-level-field', async() => {
                const col = await humansCollection.createRelated();
                const doc = await col.findOne().exec();
                const friend = await doc.bestFriend_;
                assert.equal(friend.constructor.name, 'RxDocument');
                assert.equal(friend.name, doc.bestFriend);
                col.database.destroy();
            });
            it('populate nested field', async() => {
                const col = await humansCollection.createRelatedNested();
                const doc = await col.findOne().exec();
                const friend = await doc.foo.bestFriend_;
                assert.equal(friend.constructor.name, 'RxDocument');
                assert.equal(friend.name, doc.foo.bestFriend);
                col.database.destroy();
            });
        });
    });
    describe('issues', () => {
        it('#222 population not working when multiInstance: false', async() => {
            const db = await RxDatabase.create({
                name: util.randomCouchString(10),
                adapter: 'memory',
                multiInstance: false  // this must be false here
            });
            const colA = await db.collection({
                name: 'doca',
                schema: {
                    name: 'doca',
                    version: 0,
                    properties: {
                        name: {
                            primary: true,
                            type: 'string'
                        },
                        refB: {
                            ref: 'docb', // refers to collection human
                            type: 'string' // ref-values must always be string (primary of foreign RxDocument)
                        }
                    }
                }
            });
            const colB = await db.collection({
                name: 'docb',
                schema: {
                    name: 'docb',
                    version: 0,
                    properties: {
                        name: {
                            primary: true,
                            type: 'string'
                        },
                        somevalue: {
                            type: 'string'
                        }
                    }
                }
            });
            await colB.insert({
                name: 'docB-01',
                somevalue: 'foobar'
            });
            await colA.insert({
                name: 'docA-01',
                refB: 'docB-01'
            });

            const docA = await colA.findOne().where('name').eq('docA-01').exec();
            const docB = await docA.populate('refB');

            assert.ok(RxDocument.isInstanceOf(docB));
            assert.equal(docB.somevalue, 'foobar');

            db.destroy();
        });
    });
});
