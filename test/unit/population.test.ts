import assert from 'assert';
import config from './config';
import * as faker from 'faker';

import * as humansCollection from '../helper/humans-collection';

import {
    createRxDatabase,
    isRxDocument,
    randomCouchString,
    createRxSchema,
    RxJsonSchema
} from '../../plugins/core';

config.parallel('population.test.js', () => {
    describe('createRxSchema', () => {
        describe('positive', () => {
            it('should allow to create a schema with a relation', () => {
                const schema = createRxSchema({
                    version: 0,
                    type: 'object',
                    properties: {
                        bestFriend: {
                            ref: 'human',
                            type: 'string'
                        }
                    }
                });
                assert.strictEqual(schema.constructor.name, 'RxSchema');
            });
            /**
             * This was not allowed in the past
             * but is makes no sense to not allow using the primary as ref key
             * @link https://github.com/pubkey/rxdb/issues/2747
             */
            it('should allow primary as relation key', () => {
                const schema = createRxSchema({
                    version: 0,
                    type: 'object',
                    properties: {
                        bestFriend: {
                            ref: 'human',
                            type: 'string',
                            primary: true
                        }
                    }
                });
                assert.strictEqual(schema.constructor.name, 'RxSchema');
            });
            it('should allow to create a schema with a relation in nested', () => {
                const schema = createRxSchema({
                    version: 0,
                    type: 'object',
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
                assert.strictEqual(schema.constructor.name, 'RxSchema');
            });
            it('should allow to create relation of array', () => {
                const schema = createRxSchema({
                    version: 0,
                    type: 'object',
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
                assert.strictEqual(schema.constructor.name, 'RxSchema');
            });
            it('should allow to create relation with nullable string', () => {
                const schema = createRxSchema({
                    version: 0,
                    type: 'object',
                    properties: {
                        friends: {
                            type: 'array',
                            items: {
                                ref: 'human',
                                type: ['string', 'null']
                            }
                        }
                    }
                });
                assert.strictEqual(schema.constructor.name, 'RxSchema');
            });
        });
        describe('negative', () => {
            it('throw if ref-type is no string', () => {
                assert.throws(
                    () => createRxSchema({
                        version: 0,
                        type: 'object',
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
                    () => createRxSchema({
                        version: 0,
                        type: 'object',
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
            it('populate top-level-field', async () => {
                const col = await humansCollection.createRelated();
                const doc = await col.findOne().exec(true);
                const friend = await doc.populate('bestFriend');
                assert.ok(isRxDocument(friend));
                assert.strictEqual(friend.name, doc.bestFriend);
                col.database.destroy();
            });
            it('populate nested field', async () => {
                const col = await humansCollection.createRelatedNested();
                const doc = await col.findOne().exec(true);
                const friend = await doc.populate('foo.bestFriend');
                assert.ok(isRxDocument(friend));
                assert.strictEqual(friend.name, doc.foo.bestFriend);
                col.database.destroy();
            });
            it('populate string-array', async () => {
                const db = await createRxDatabase({
                    name: randomCouchString(10),
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
                const friends = new Array(5)
                    .fill(0)
                    .map(() => {
                        return {
                            name: faker.name.firstName() + randomCouchString(5),
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
                friendDocs.forEach((friend: any) => {
                    assert.ok(isRxDocument(friend));
                });
                db.destroy();
            });
            it('populate with primary as ref', async () => {
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    adapter: 'memory'
                });
                const schema: RxJsonSchema = {
                    version: 0,
                    type: 'object',
                    properties: {
                        name: {
                            type: 'string',
                            primary: true,
                            ref: 'human2'
                        }
                    }
                };
                const col = await db.collection<{ name: string }>({
                    name: 'human',
                    schema
                });
                const col2 = await db.collection({
                    name: 'human2',
                    schema
                });

                const doc = await col.insert({
                    name: 'foobar'
                });
                await col2.insert({
                    name: 'foobar'
                });
                const doc2 = await doc.populate(doc.primaryPath);
                assert.ok(doc2.collection === col2);

                db.destroy();
            });
        });
    });
    describe('RxDocument populate via pseudo-proxy', () => {
        describe('positive', () => {
            it('populate top-level-field', async () => {
                const col = await humansCollection.createRelated();
                const doc = await col.findOne().exec(true);
                const friend = await (doc as any).bestFriend_;
                assert.ok(isRxDocument(friend));
                assert.strictEqual(friend.name, doc.bestFriend);
                col.database.destroy();
            });
            it('populate nested field', async () => {
                const col = await humansCollection.createRelatedNested();
                const doc = await col.findOne().exec(true);
                const friend = await (doc as any).foo.bestFriend_;
                assert.ok(isRxDocument(friend));
                assert.strictEqual(friend.name, doc.foo.bestFriend);
                col.database.destroy();
            });
        });
    });
    describe('issues', () => {
        it('#222 population not working when multiInstance: false', async () => {
            const db = await createRxDatabase({
                name: randomCouchString(10),
                adapter: 'memory',
                multiInstance: false // this must be false here
            });
            const colA = await db.collection({
                name: 'doca',
                schema: {
                    type: 'object',
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
                    version: 0,
                    type: 'object',
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

            assert.ok(isRxDocument(docB));
            assert.strictEqual(docB.somevalue, 'foobar');

            db.destroy();
        });
    });
});
