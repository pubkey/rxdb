import assert from 'assert';
import config, { describeParallel } from './config.ts';

import {
    createRxDatabase,
    isRxDocument,
    randomToken,
    createRxSchema,
    RxJsonSchema,
    defaultHashSha256,
    addRxPlugin,
} from '../../plugins/core/index.mjs';
import {
    humansCollection,
    randomStringWithSpecialChars
} from '../../plugins/test-utils/index.mjs';
import { RxDBQueryBuilderPlugin } from '../../plugins/query-builder/index.mjs';
addRxPlugin(RxDBQueryBuilderPlugin);


describeParallel('population.test.js', () => {
    describe('createRxSchema', () => {
        describe('positive', () => {
            it('should allow to create a schema with a relation', () => {
                const schema = createRxSchema({
                    version: 0,
                    primaryKey: 'bestFriend',
                    type: 'object',
                    properties: {
                        bestFriend: {
                            ref: 'human',
                            type: 'string',
                            maxLength: 100
                        }
                    }
                }, defaultHashSha256);
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
                    primaryKey: 'bestFriend',
                    type: 'object',
                    properties: {
                        bestFriend: {
                            ref: 'human',
                            type: 'string',
                            maxLength: 100
                        }
                    }
                }, defaultHashSha256);
                assert.strictEqual(schema.constructor.name, 'RxSchema');
            });
            it('should allow to create a schema with a relation in nested', () => {
                const schema = createRxSchema<any>({
                    version: 0,
                    primaryKey: 'id',
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            maxLength: 100
                        },
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
                }, defaultHashSha256);
                assert.strictEqual(schema.constructor.name, 'RxSchema');
            });
            it('should allow to create relation of array', () => {
                const schema = createRxSchema<any>({
                    version: 0,
                    primaryKey: 'id',
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            maxLength: 100
                        },
                        friends: {
                            type: 'array',
                            items: {
                                ref: 'human',
                                type: 'string'
                            }
                        }
                    }
                }, defaultHashSha256);
                assert.strictEqual(schema.constructor.name, 'RxSchema');
            });
            it('should allow to create relation with nullable string', () => {
                const schema = createRxSchema<any>({
                    version: 0,
                    primaryKey: 'id',
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            maxLength: 100
                        },
                        friends: {
                            type: 'array',
                            items: {
                                ref: 'human',
                                type: ['string', 'null']
                            }
                        }
                    }
                }, defaultHashSha256);
                assert.strictEqual(schema.constructor.name, 'RxSchema');
            });
        });
        describe('negative', () => {
            it('throw if ref-type is no string', () => {
                assert.throws(
                    () => createRxSchema<any>({
                        version: 0,
                        primaryKey: 'id',
                        type: 'object',
                        properties: {
                            id: {
                                type: 'string',
                                maxLength: 100
                            },
                            bestFriend: {
                                ref: 'human'
                            }
                        }
                    }, defaultHashSha256)
                );
            });
            it('throw if ref-type is no string (array)', () => {
                assert.throws(
                    () => createRxSchema<any>({
                        version: 0,
                        primaryKey: 'id',
                        type: 'object',
                        properties: {
                            id: {
                                type: 'string',
                                maxLength: 100
                            },
                            friends: {
                                type: 'array',
                                items: {
                                    ref: 'human'
                                }
                            }
                        }
                    }, defaultHashSha256)
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
                col.database.close();
            });
            it('populate nested field', async () => {
                const col = await humansCollection.createRelatedNested();
                const doc = await col.findOne().exec(true);
                const friend = await doc.populate('foo.bestFriend');
                assert.ok(isRxDocument(friend));
                assert.strictEqual(friend.name, doc.foo.bestFriend);
                col.database.close();
            });
            it('populate string-array', async () => {
                const db = await createRxDatabase({
                    name: randomToken(10),
                    storage: config.storage.getStorage(),
                });
                const cols = await db.addCollections({
                    human: {
                        schema: {
                            version: 0,
                            primaryKey: 'name',
                            type: 'object',
                            properties: {
                                name: {
                                    type: 'string',
                                    maxLength: 100
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
                    }
                });
                const col = cols.human;
                const friends = new Array(5)
                    .fill(0)
                    .map(() => {
                        return {
                            name: randomStringWithSpecialChars(3, 12),
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
                db.close();
            });
            it('populate with primary as ref', async () => {
                const db = await createRxDatabase({
                    name: randomToken(10),
                    storage: config.storage.getStorage(),
                });
                const schema: RxJsonSchema<{ name: string; }> = {
                    version: 0,
                    primaryKey: 'name',
                    type: 'object',
                    properties: {
                        name: {
                            type: 'string',
                            maxLength: 100,
                            ref: 'human2'
                        }
                    }
                };
                const cols = await db.addCollections({
                    human: {
                        schema
                    },
                    human2: {
                        schema
                    }
                });
                const col = cols.human;
                const col2 = cols.human2;

                const doc = await col.insert({
                    name: 'foobar'
                });
                await col2.insert({
                    name: 'foobar'
                });
                const doc2 = await doc.populate(doc.primaryPath);
                assert.ok(doc2.collection === col2);

                db.close();
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
                col.database.close();
            });
            it('populate nested field', async () => {
                const col = await humansCollection.createRelatedNested();
                const doc = await col.findOne().exec(true);
                const friend = await (doc as any).foo.bestFriend_;
                assert.ok(isRxDocument(friend));
                assert.strictEqual(friend.name, doc.foo.bestFriend);
                col.database.close();
            });
        });
    });
    describe('issues', () => {
        it('#222 population not working when multiInstance: false', async () => {
            const db = await createRxDatabase({
                name: randomToken(10),
                storage: config.storage.getStorage(),
                multiInstance: false // this must be false here
            });
            const cols = await db.addCollections({
                doca: {
                    schema: {
                        type: 'object',
                        primaryKey: 'name',
                        version: 0,
                        properties: {
                            name: {
                                type: 'string',
                                maxLength: 100
                            },
                            refB: {
                                ref: 'docb', // refers to collection human
                                type: 'string' // ref-values must always be string (primary of foreign RxDocument)
                            }
                        }
                    }
                },
                docb: {
                    schema: {
                        version: 0,
                        primaryKey: 'name',
                        type: 'object',
                        properties: {
                            name: {
                                type: 'string',
                                maxLength: 100
                            },
                            somevalue: {
                                type: 'string'
                            }
                        }
                    }
                }
            });
            const colA = cols.doca;
            const colB = cols.docb;

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

            db.close();
        });
        it('populate array should preserve the order of ref ids when two documents reference the same set in different order', async () => {
            const db = await createRxDatabase({
                name: randomToken(10),
                storage: config.storage.getStorage(),
            });
            const cols = await db.addCollections({
                human: {
                    schema: {
                        version: 0,
                        primaryKey: 'name',
                        type: 'object',
                        properties: {
                            name: {
                                type: 'string',
                                maxLength: 100
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
                }
            });
            const col = cols.human;

            const friendNames = ['charlie', 'alice', 'bob', 'eve', 'dave'];
            await Promise.all(
                friendNames.map(name => col.insert({ name, friends: [] }))
            );

            // Two documents reference the same set of friends but in different order.
            // Because findByIds uses a sorted cache key, the second populate call
            // would reuse the first cached query and return documents in the wrong order.
            const orderA = ['eve', 'bob', 'charlie', 'alice', 'dave'];
            const orderB = ['dave', 'alice', 'charlie', 'bob', 'eve'];
            await col.insert({ name: 'protagonist-a', friends: orderA });
            await col.insert({ name: 'protagonist-b', friends: orderB });

            const docA = await col.findOne('protagonist-a').exec(true);
            const docB = await col.findOne('protagonist-b').exec(true);

            const friendDocsA = await docA.populate('friends');
            const friendDocsB = await docB.populate('friends');

            const populatedNamesA = friendDocsA.map((d: any) => d.name);
            const populatedNamesB = friendDocsB.map((d: any) => d.name);

            assert.deepStrictEqual(
                populatedNamesA,
                orderA,
                'populated array order for docA must match its ref id order'
            );
            assert.deepStrictEqual(
                populatedNamesB,
                orderB,
                'populated array order for docB must match its ref id order'
            );

            db.close();
        });
        it('populate array when ref is defined on items instead of on the array field', async () => {
            const db = await createRxDatabase({
                name: randomToken(10),
                storage: config.storage.getStorage(),
            });
            const cols = await db.addCollections({
                human: {
                    schema: {
                        version: 0,
                        primaryKey: 'name',
                        type: 'object',
                        properties: {
                            name: {
                                type: 'string',
                                maxLength: 100
                            },
                            friends: {
                                type: 'array',
                                items: {
                                    ref: 'human',
                                    type: 'string'
                                }
                            }
                        }
                    }
                }
            });
            const col = cols.human;

            const friendNames = ['alice', 'bob', 'charlie'];
            await Promise.all(
                friendNames.map(name => col.insert({ name, friends: [] }))
            );
            await col.insert({
                name: 'protagonist',
                friends: friendNames
            });

            const doc = await col.findOne('protagonist').exec(true);

            // populate() must work when 'ref' is on items
            const friendDocs = await doc.populate('friends');
            assert.ok(Array.isArray(friendDocs));
            assert.strictEqual(friendDocs.length, 3);
            friendDocs.forEach((friend: any) => {
                assert.ok(isRxDocument(friend));
            });
            const populatedNames = friendDocs.map((d: any) => d.name);
            assert.deepStrictEqual(populatedNames, friendNames);

            // pseudo-proxy _ getter must also work
            const friendDocs2 = await (doc as any).friends_;
            assert.ok(Array.isArray(friendDocs2));
            assert.strictEqual(friendDocs2.length, 3);

            db.close();
        });
    });
});
