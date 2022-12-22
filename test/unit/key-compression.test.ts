/**
 * this test is for the keycompression-capabilities of rxdb
 */
import assert from 'assert';
import config from './config';


import {
    createRxDatabase,
    randomCouchString,
    isRxDocument,
    RxJsonSchema,
    RxCollection,
    RxStorageInstance,
} from '../../';
import * as schemaObjects from '../helper/schema-objects';
import {
    wrappedKeyCompressionStorage
} from '../../plugins/key-compression';
import { HumanDocumentType, human, enableKeyCompression } from '../helper/schemas';


config.parallel('key-compression.test.js', () => {
    async function getCollection() {
        const db = await createRxDatabase<{ human: RxCollection<HumanDocumentType>; }>({
            name: randomCouchString(10),
            storage: wrappedKeyCompressionStorage({
                storage: config.storage.getStorage()
            }),
            multiInstance: false,
            ignoreDuplicate: true,
            localDocuments: true
        });

        const collections = await db.addCollections({
            human: {
                schema: enableKeyCompression(human),
                localDocuments: true
            }
        });
        return collections.human;
    }

    describe('.getPreparedQuery()', () => {
        it('transform basic search keys', async () => {
            const c = await getCollection();
            const query: any = c.find()
                .where('firstName').eq('myFirstName')
                .getPreparedQuery();
            const jsonString = JSON.stringify(query);
            assert.ok(!jsonString.includes('firstName'));
            assert.ok(jsonString.includes('myFirstName'));
            c.database.destroy();
        });
    });
    describe('integration into pouchDB', () => {
        it('should have saved a compressed document', async () => {
            const c = await getCollection();
            const docData = schemaObjects.simpleHuman();
            await c.insert(docData);


            const internalInstance: RxStorageInstance<schemaObjects.SimpleHumanDocumentType, any, any> = await (c.storageInstance.originalStorageInstance as any)
                .originalStorageInstance;

            const storageDocs = await internalInstance.findDocumentsById([docData.passportId], true);
            const storageDoc = storageDocs[docData.passportId];
            Object.keys(storageDoc)
                .filter(key => !key.startsWith('_'))
                .filter(key => key !== c.schema.primaryPath)
                .forEach(key => {
                    assert.ok(key.length <= 3);
                    assert.strictEqual(typeof (storageDoc as any)[key], 'string');
                });

            // should keep the primary path and _meta
            assert.ok(storageDoc._meta);
            assert.strictEqual((storageDoc as any)[c.schema.primaryPath], docData.passportId);
            assert.strictEqual((storageDoc as any)['|a'], docData.firstName);
            c.database.destroy();
        });
    });
    describe('query', () => {
        it('should properly run the compressed query', async () => {
            const col = await getCollection();
            assert.ok(col.schema.jsonSchema.keyCompression);

            // add one matching and one non-matching doc
            await col.bulkInsert([
                {
                    firstName: 'aaa',
                    lastName: 'aaa',
                    passportId: 'aaa',
                    age: 0
                },
                {
                    firstName: 'bbb',
                    lastName: 'bbb',
                    passportId: 'bbb',
                    age: 0
                }
            ]);
            const query = col.find({
                selector: {
                    firstName: {
                        $ne: 'aaa'
                    }
                }
            });
            const docs = await query.exec();
            const doc = docs[0];
            if (!doc) {
                throw new Error('doc missing');
            }

            assert.strictEqual(doc.passportId, 'bbb');

            col.database.destroy();
        });
    });
    describe('issues', () => {
        it('#50 compress string array properly', async () => {
            const mySchema: RxJsonSchema<{ likes: any[]; id: string; }> = {
                title: 'hero schema',
                version: 0,
                description: 'describes a simple hero',
                primaryKey: 'id',
                required: [
                    'id'
                ],
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        maxLength: 100
                    },
                    likes: {
                        type: 'array',
                        items: {
                            type: 'string'
                        }
                    }
                }
            };

            const db = await createRxDatabase({
                name: 'heroesdb',
                storage: config.storage.getStorage()
            });
            const collections = await db.addCollections({
                mycollection: {
                    schema: mySchema
                }
            });
            const collection = collections.mycollection;
            const docData = {
                id: randomCouchString(12),
                likes: ['abc', '8']
            };
            await collection.insert(docData);
            const doc = await collection.findOne().exec();
            assert.ok(isRxDocument(doc));
            assert.deepStrictEqual(doc.likes, docData.likes);
            db.destroy();
        });
        it('error on nested null', async () => {
            const mySchema = {
                title: 'hero schema',
                version: 0,
                description: 'describes a simple hero',
                primaryKey: 'key',
                required: ['key'],
                type: 'object',
                properties: {
                    key: {
                        type: 'string',
                        maxLength: 100
                    },
                    nested: {
                        type: 'object'
                    }
                }
            };

            const db = await createRxDatabase({
                name: randomCouchString(10),
                storage: config.storage.getStorage()
            });
            const collections = await db.addCollections({
                mycollection: {
                    schema: mySchema
                }
            });
            const collection = collections.mycollection;

            const docData = {
                key: 'foobar',
                nested: {
                    lastProvider: null,
                    providers: 0,
                    sync: false,
                    other: {}
                }
            };
            await collection.insert(docData);

            db.destroy();
        });
        /**
         * Running this query must work
         * because it is used in the client-side-databases comparison project.
         * @link https://github.com/pubkey/client-side-databases
         */
        it('query over compressed index', async () => {
            type RxMessageDocumentType = {
                id: string;
                text: string;
                createdAt: number;
                read: boolean;
                sender: string;
                receiver: string;
            };
            const schema: RxJsonSchema<RxMessageDocumentType> = {
                title: 'messages schema',
                description: 'describes a message',
                version: 0,
                keyCompression: true,
                primaryKey: 'id',
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        maxLength: 40
                    },
                    text: {
                        type: 'string'
                    },
                    createdAt: {
                        type: 'number',
                        minimum: 0,
                        maximum: 100000000000000,
                        multipleOf: 1
                    },
                    read: {
                        description: 'true if was read by the receiver',
                        type: 'boolean'
                    },
                    sender: {
                        type: 'string',
                        ref: 'users',
                        maxLength: 40
                    },
                    receiver: {
                        type: 'string',
                        ref: 'users',
                        maxLength: 40
                    }
                },
                indexes: [
                    'createdAt'
                ],
                required: [
                    'text',
                    'createdAt',
                    'read',
                    'sender',
                    'receiver'
                ]
            };

            const db = await createRxDatabase({
                name: randomCouchString(10),
                storage: wrappedKeyCompressionStorage({
                    storage: config.storage.getStorage()
                })
            });

            const collections = await db.addCollections({
                messages: {
                    schema
                }
            });
            const collection: RxCollection<RxMessageDocumentType> = collections.messages;
            await collection.insert({
                id: 'xxx',
                text: 'foobar',
                createdAt: 100,
                read: false,
                sender: 'a',
                receiver: 'b'
            });
            const query = collection.findOne({
                selector: {
                    $or: [
                        {
                            sender: 'a',
                            receiver: 'b'
                        },
                        {
                            sender: 'b',
                            receiver: 'a'
                        }
                    ]
                },
                sort: [
                    { createdAt: 'asc' },
                    { id: 'asc' }
                ]
            });


            const result = await query.exec(true);
            assert.strictEqual(result.id, 'xxx');
            db.destroy();
        });
    });
});
