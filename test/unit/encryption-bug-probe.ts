/**
 * Probe various encryption edge cases to find bugs.
 * Run with: cross-env DEFAULT_STORAGE=memory npx mocha --config ./config/.mocharc.cjs --grep "encryption-bug-probe" ./test_tmp/unit.test.js
 */
import assert from 'assert';
import config, { describeParallel } from './config.ts';

import {
    getPassword,
    getEncryptedStorage,
} from '../../plugins/test-utils/index.mjs';

import {
    createRxDatabase,
    RxJsonSchema,
    randomToken,
    RxCollection,
    RxStorage,
} from '../../plugins/core/index.mjs';

import {
    wrappedKeyEncryptionCryptoJsStorage
} from '../../plugins/encryption-crypto-js/index.mjs';
import { getRxStorageMemory } from '../../plugins/storage-memory/index.mjs';
import { wrappedValidateAjvStorage } from '../../plugins/validate-ajv/index.mjs';
import { firstValueFrom } from 'rxjs';
import { filter } from 'rxjs/operators';


describeParallel('encryption-bug-probe', () => {
    let storage: RxStorage<any, any>;
    describe('init', () => {
        it('create storage', () => {
            storage = getEncryptedStorage();
        });
    });

    describe('BUG: encrypting both parent and nested child path corrupts data on read', () => {
        /**
         * When encrypted contains both a parent path and a child path
         * (e.g. ['nested', 'nested.secret']),
         * modifyToStorage correctly encrypts 'nested' as a whole
         * and skips 'nested.secret' (because 'nested' is already a string).
         *
         * But modifyFromStorage first decrypts 'nested' (restoring the object),
         * then tries to decryptString() the plaintext 'nested.secret' value,
         * causing a crash or garbled data.
         */
        it('should not corrupt data when encrypted has overlapping parent+child paths', async () => {
            if (config.storage.hasEncryption) {
                return;
            }
            type DocType = {
                id: string;
                nested: {
                    secret: string;
                    label: string;
                };
            };
            const mySchema: RxJsonSchema<DocType> = {
                version: 0,
                primaryKey: 'id',
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        maxLength: 100
                    },
                    nested: {
                        type: 'object',
                        properties: {
                            secret: { type: 'string' },
                            label: { type: 'string' }
                        },
                        required: ['secret', 'label']
                    }
                },
                required: ['id', 'nested'],
                encrypted: [
                    'nested',
                    'nested.secret'
                ]
            };
            const db = await createRxDatabase<{ test: RxCollection<DocType>; }>({
                name: randomToken(10),
                storage: wrappedKeyEncryptionCryptoJsStorage({
                    storage: wrappedValidateAjvStorage({
                        storage: getRxStorageMemory()
                    })
                }),
                password: await getPassword()
            });
            const collections = await db.addCollections({
                test: { schema: mySchema }
            });

            await collections.test.insert({
                id: 'doc1',
                nested: { secret: 'classified', label: 'public-label' }
            });
            const doc = await collections.test.findOne('doc1').exec(true);

            // The encrypted+decrypted value must match the original
            assert.strictEqual(doc.nested.secret, 'classified');
            assert.strictEqual(doc.nested.label, 'public-label');

            await db.remove();
        });
    });

    describe('encrypted field with default value', () => {
        it('should apply and correctly encrypt/decrypt a top-level default value', async () => {
            type DocType = {
                id: string;
                secret: string;
            };
            const mySchema: RxJsonSchema<DocType> = {
                version: 0,
                primaryKey: 'id',
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        maxLength: 100
                    },
                    secret: {
                        type: 'string',
                        default: 'my-default-secret'
                    }
                },
                required: ['id'],
                encrypted: ['secret']
            };
            const db = await createRxDatabase<{ test: RxCollection<DocType>; }>({
                name: randomToken(10),
                storage,
                password: await getPassword()
            });
            const collections = await db.addCollections({
                test: { schema: mySchema }
            });

            // Insert without specifying secret - default should be applied
            await collections.test.insert({ id: 'doc1' } as any);
            const doc = await collections.test.findOne('doc1').exec(true);
            assert.strictEqual(doc.secret, 'my-default-secret');

            await db.remove();
        });
    });

    describe('encrypted boolean field', () => {
        it('should correctly encrypt/decrypt false (falsy value)', async () => {
            type DocType = {
                id: string;
                secret: boolean;
            };
            const mySchema: RxJsonSchema<DocType> = {
                version: 0,
                primaryKey: 'id',
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        maxLength: 100
                    },
                    secret: {
                        type: 'boolean'
                    }
                },
                required: ['id', 'secret'],
                encrypted: ['secret']
            };
            const db = await createRxDatabase<{ test: RxCollection<DocType>; }>({
                name: randomToken(10),
                storage,
                password: await getPassword()
            });
            const collections = await db.addCollections({
                test: { schema: mySchema }
            });

            await collections.test.insert({ id: 'doc1', secret: false });
            const doc = await collections.test.findOne('doc1').exec(true);
            assert.strictEqual(doc.secret, false);
            assert.strictEqual(typeof doc.secret, 'boolean');

            // Update from false to true
            await doc.incrementalPatch({ secret: true });
            const doc2 = await collections.test.findOne('doc1').exec(true);
            assert.strictEqual(doc2.secret, true);

            await db.remove();
        });
    });

    describe('encrypted integer field', () => {
        it('should correctly encrypt/decrypt zero (falsy value)', async () => {
            type DocType = {
                id: string;
                secret: number;
            };
            const mySchema: RxJsonSchema<DocType> = {
                version: 0,
                primaryKey: 'id',
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        maxLength: 100
                    },
                    secret: {
                        type: 'integer'
                    }
                },
                required: ['id', 'secret'],
                encrypted: ['secret']
            };
            const db = await createRxDatabase<{ test: RxCollection<DocType>; }>({
                name: randomToken(10),
                storage,
                password: await getPassword()
            });
            const collections = await db.addCollections({
                test: { schema: mySchema }
            });

            await collections.test.insert({ id: 'doc1', secret: 0 });
            const doc = await collections.test.findOne('doc1').exec(true);
            assert.strictEqual(doc.secret, 0);
            assert.strictEqual(typeof doc.secret, 'number');

            await db.remove();
        });
    });

    describe('encrypted array field', () => {
        it('should correctly encrypt/decrypt an array value', async () => {
            type DocType = {
                id: string;
                secret: number[];
            };
            const mySchema: RxJsonSchema<DocType> = {
                version: 0,
                primaryKey: 'id',
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        maxLength: 100
                    },
                    secret: {
                        type: 'array',
                        items: { type: 'number' }
                    }
                },
                required: ['id', 'secret'],
                encrypted: ['secret']
            };
            const db = await createRxDatabase<{ test: RxCollection<DocType>; }>({
                name: randomToken(10),
                storage,
                password: await getPassword()
            });
            const collections = await db.addCollections({
                test: { schema: mySchema }
            });

            await collections.test.insert({ id: 'doc1', secret: [1, 2, 3] });
            const doc = await collections.test.findOne('doc1').exec(true);
            assert.deepStrictEqual(doc.secret, [1, 2, 3]);
            assert.ok(Array.isArray(doc.secret));

            await db.remove();
        });
    });

    describe('encrypted field with validator storage', () => {
        it('should work with encrypted array field and validator', async () => {
            if (config.storage.hasEncryption) {
                return;
            }
            type DocType = {
                id: string;
                secret: number[];
            };
            const mySchema: RxJsonSchema<DocType> = {
                version: 0,
                primaryKey: 'id',
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        maxLength: 100
                    },
                    secret: {
                        type: 'array',
                        items: { type: 'number' }
                    }
                },
                required: ['id', 'secret'],
                encrypted: ['secret']
            };
            const db = await createRxDatabase<{ test: RxCollection<DocType>; }>({
                name: randomToken(10),
                storage: wrappedKeyEncryptionCryptoJsStorage({
                    storage: wrappedValidateAjvStorage({
                        storage: getRxStorageMemory()
                    })
                }),
                password: await getPassword()
            });
            const collections = await db.addCollections({
                test: { schema: mySchema }
            });

            await collections.test.insert({ id: 'doc1', secret: [10, 20, 30] });
            const doc = await collections.test.findOne('doc1').exec(true);
            assert.deepStrictEqual(doc.secret, [10, 20, 30]);

            await db.remove();
        });

        it('should work with encrypted nested integer field and validator', async () => {
            if (config.storage.hasEncryption) {
                return;
            }
            type DocType = {
                id: string;
                nested: {
                    secretScore: number;
                    label: string;
                };
            };
            const mySchema: RxJsonSchema<DocType> = {
                version: 0,
                primaryKey: 'id',
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        maxLength: 100
                    },
                    nested: {
                        type: 'object',
                        properties: {
                            secretScore: {
                                type: 'integer',
                                minimum: 0,
                                maximum: 100
                            },
                            label: {
                                type: 'string'
                            }
                        },
                        required: ['secretScore', 'label']
                    }
                },
                required: ['id', 'nested'],
                encrypted: ['nested.secretScore']
            };
            const db = await createRxDatabase<{ test: RxCollection<DocType>; }>({
                name: randomToken(10),
                storage: wrappedKeyEncryptionCryptoJsStorage({
                    storage: wrappedValidateAjvStorage({
                        storage: getRxStorageMemory()
                    })
                }),
                password: await getPassword()
            });
            const collections = await db.addCollections({
                test: { schema: mySchema }
            });

            await collections.test.insert({
                id: 'doc1',
                nested: { secretScore: 42, label: 'test' }
            });
            const doc = await collections.test.findOne('doc1').exec(true);
            assert.strictEqual(doc.nested.secretScore, 42);
            assert.strictEqual(typeof doc.nested.secretScore, 'number');
            assert.strictEqual(doc.nested.label, 'test');

            await db.remove();
        });
    });

    describe('observable behavior with encrypted fields', () => {
        it('doc.$ should emit decrypted data after update', async () => {
            type DocType = {
                id: string;
                secret: string;
                name: string;
            };
            const mySchema: RxJsonSchema<DocType> = {
                version: 0,
                primaryKey: 'id',
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        maxLength: 100
                    },
                    secret: {
                        type: 'string'
                    },
                    name: {
                        type: 'string'
                    }
                },
                required: ['id', 'secret', 'name'],
                encrypted: ['secret']
            };
            const db = await createRxDatabase<{ test: RxCollection<DocType>; }>({
                name: randomToken(10),
                storage,
                password: await getPassword()
            });
            const collections = await db.addCollections({
                test: { schema: mySchema }
            });

            await collections.test.insert({ id: 'doc1', secret: 'initial', name: 'Alice' });
            const doc = await collections.test.findOne('doc1').exec(true);

            // Subscribe and wait for the next emission after update
            const emitPromise = firstValueFrom(
                doc.$.pipe(
                    filter(d => d.secret === 'updated')
                )
            );

            await doc.incrementalPatch({ secret: 'updated' });
            const emitted = await emitPromise;
            assert.strictEqual(emitted.secret, 'updated');
            assert.strictEqual(emitted.name, 'Alice');

            await db.remove();
        });

        it('collection.find().$ should emit decrypted data', async () => {
            type DocType = {
                id: string;
                secret: string;
                name: string;
            };
            const mySchema: RxJsonSchema<DocType> = {
                version: 0,
                primaryKey: 'id',
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        maxLength: 100
                    },
                    secret: {
                        type: 'string'
                    },
                    name: {
                        type: 'string'
                    }
                },
                required: ['id', 'secret', 'name'],
                encrypted: ['secret']
            };
            const db = await createRxDatabase<{ test: RxCollection<DocType>; }>({
                name: randomToken(10),
                storage,
                password: await getPassword()
            });
            const collections = await db.addCollections({
                test: { schema: mySchema }
            });

            await collections.test.insert({ id: 'doc1', secret: 'mysecret', name: 'Alice' });

            const results = await collections.test.find().exec();
            assert.strictEqual(results.length, 1);
            assert.strictEqual(results[0].secret, 'mysecret');
            assert.strictEqual(results[0].name, 'Alice');

            await db.remove();
        });
    });

    describe('bulkInsert with encrypted fields', () => {
        it('should correctly encrypt/decrypt all documents in a bulk insert', async () => {
            type DocType = {
                id: string;
                secret: string;
            };
            const mySchema: RxJsonSchema<DocType> = {
                version: 0,
                primaryKey: 'id',
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        maxLength: 100
                    },
                    secret: {
                        type: 'string'
                    }
                },
                required: ['id', 'secret'],
                encrypted: ['secret']
            };
            const db = await createRxDatabase<{ test: RxCollection<DocType>; }>({
                name: randomToken(10),
                storage,
                password: await getPassword()
            });
            const collections = await db.addCollections({
                test: { schema: mySchema }
            });

            const docs = Array.from({ length: 20 }, (_, i) => ({
                id: `doc-${i}`,
                secret: `secret-value-${i}`
            }));
            await collections.test.bulkInsert(docs);

            const allDocs = await collections.test.find().exec();
            assert.strictEqual(allDocs.length, 20);

            for (let i = 0; i < 20; i++) {
                const doc = await collections.test.findOne(`doc-${i}`).exec(true);
                assert.strictEqual(doc.secret, `secret-value-${i}`);
            }

            await db.remove();
        });
    });

    describe('incrementalModify with nested encrypted sibling', () => {
        it('modifying only non-encrypted sibling should preserve encrypted sibling value', async () => {
            type DocType = {
                id: string;
                nested: {
                    secret: string;
                    label: string;
                };
            };
            const mySchema: RxJsonSchema<DocType> = {
                version: 0,
                primaryKey: 'id',
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        maxLength: 100
                    },
                    nested: {
                        type: 'object',
                        properties: {
                            secret: { type: 'string' },
                            label: { type: 'string' }
                        },
                        required: ['secret', 'label']
                    }
                },
                required: ['id', 'nested'],
                encrypted: ['nested.secret']
            };
            const db = await createRxDatabase<{ test: RxCollection<DocType>; }>({
                name: randomToken(10),
                storage,
                password: await getPassword()
            });
            const collections = await db.addCollections({
                test: { schema: mySchema }
            });

            await collections.test.insert({
                id: 'doc1',
                nested: { secret: 'classified', label: 'original-label' }
            });
            const doc = await collections.test.findOne('doc1').exec(true);

            // Modify ONLY the non-encrypted sibling using incrementalModify
            await doc.incrementalModify(d => {
                d.nested.label = 'updated-label';
                return d;
            });

            const updatedDoc = await collections.test.findOne('doc1').exec(true);
            assert.strictEqual(updatedDoc.nested.label, 'updated-label');
            assert.strictEqual(updatedDoc.nested.secret, 'classified');

            await db.remove();
        });
    });

    describe('toJSON / toMutableJSON with encrypted fields', () => {
        it('toMutableJSON should return decrypted data that can be re-inserted', async () => {
            type DocType = {
                id: string;
                secret: string;
                name: string;
            };
            const mySchema: RxJsonSchema<DocType> = {
                version: 0,
                primaryKey: 'id',
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        maxLength: 100
                    },
                    secret: {
                        type: 'string'
                    },
                    name: {
                        type: 'string'
                    }
                },
                required: ['id', 'secret', 'name'],
                encrypted: ['secret']
            };
            const db = await createRxDatabase<{ test: RxCollection<DocType>; }>({
                name: randomToken(10),
                storage,
                password: await getPassword()
            });
            const collections = await db.addCollections({
                test: { schema: mySchema }
            });

            await collections.test.insert({ id: 'doc1', secret: 'original-secret', name: 'Alice' });
            const doc = await collections.test.findOne('doc1').exec(true);

            // Get mutable JSON and re-insert with different ID
            const json = doc.toMutableJSON();
            assert.strictEqual(json.secret, 'original-secret');

            json.id = 'doc2';
            json.secret = 'copied-secret';
            await collections.test.insert(json);

            const doc2 = await collections.test.findOne('doc2').exec(true);
            assert.strictEqual(doc2.secret, 'copied-secret');
            assert.strictEqual(doc2.name, 'Alice');

            await db.remove();
        });
    });

    describe('encrypted field with empty string', () => {
        it('should correctly handle empty string encryption', async () => {
            type DocType = {
                id: string;
                secret: string;
            };
            const mySchema: RxJsonSchema<DocType> = {
                version: 0,
                primaryKey: 'id',
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        maxLength: 100
                    },
                    secret: {
                        type: 'string'
                    }
                },
                required: ['id', 'secret'],
                encrypted: ['secret']
            };
            const db = await createRxDatabase<{ test: RxCollection<DocType>; }>({
                name: randomToken(10),
                storage,
                password: await getPassword()
            });
            const collections = await db.addCollections({
                test: { schema: mySchema }
            });

            await collections.test.insert({ id: 'doc1', secret: '' });
            const doc = await collections.test.findOne('doc1').exec(true);
            assert.strictEqual(doc.secret, '');
            assert.strictEqual(typeof doc.secret, 'string');

            await db.remove();
        });
    });

    describe('upsert with encrypted fields', () => {
        it('should correctly handle upsert insert + update cycle', async () => {
            type DocType = {
                id: string;
                secret: string;
                name: string;
            };
            const mySchema: RxJsonSchema<DocType> = {
                version: 0,
                primaryKey: 'id',
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        maxLength: 100
                    },
                    secret: {
                        type: 'string'
                    },
                    name: {
                        type: 'string'
                    }
                },
                required: ['id', 'secret', 'name'],
                encrypted: ['secret']
            };
            const db = await createRxDatabase<{ test: RxCollection<DocType>; }>({
                name: randomToken(10),
                storage,
                password: await getPassword()
            });
            const collections = await db.addCollections({
                test: { schema: mySchema }
            });

            // First upsert - insert
            await collections.test.upsert({ id: 'doc1', secret: 'secret-v1', name: 'Alice' });
            const doc1 = await collections.test.findOne('doc1').exec(true);
            assert.strictEqual(doc1.secret, 'secret-v1');

            // Second upsert - update
            await collections.test.upsert({ id: 'doc1', secret: 'secret-v2', name: 'Alice' });
            const doc2 = await collections.test.findOne('doc1').exec(true);
            assert.strictEqual(doc2.secret, 'secret-v2');

            await db.remove();
        });
    });

    describe('bulkUpsert with encrypted fields', () => {
        it('should correctly encrypt/decrypt during bulkUpsert', async () => {
            type DocType = {
                id: string;
                secret: string;
                name: string;
            };
            const mySchema: RxJsonSchema<DocType> = {
                version: 0,
                primaryKey: 'id',
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        maxLength: 100
                    },
                    secret: {
                        type: 'string'
                    },
                    name: {
                        type: 'string'
                    }
                },
                required: ['id', 'secret', 'name'],
                encrypted: ['secret']
            };
            const db = await createRxDatabase<{ test: RxCollection<DocType>; }>({
                name: randomToken(10),
                storage,
                password: await getPassword()
            });
            const collections = await db.addCollections({
                test: { schema: mySchema }
            });

            // First bulkUpsert - insert
            await collections.test.bulkUpsert([
                { id: 'doc1', secret: 'secret-a', name: 'Alice' },
                { id: 'doc2', secret: 'secret-b', name: 'Bob' }
            ]);

            const doc1 = await collections.test.findOne('doc1').exec(true);
            assert.strictEqual(doc1.secret, 'secret-a');
            const doc2 = await collections.test.findOne('doc2').exec(true);
            assert.strictEqual(doc2.secret, 'secret-b');

            // Second bulkUpsert - update
            await collections.test.bulkUpsert([
                { id: 'doc1', secret: 'secret-a-v2', name: 'Alice' },
                { id: 'doc2', secret: 'secret-b-v2', name: 'Bob' }
            ]);

            const doc1v2 = await collections.test.findOne('doc1').exec(true);
            assert.strictEqual(doc1v2.secret, 'secret-a-v2');
            const doc2v2 = await collections.test.findOne('doc2').exec(true);
            assert.strictEqual(doc2v2.secret, 'secret-b-v2');

            await db.remove();
        });
    });

    describe('encrypted data not visible in raw storage', () => {
        it('secret values should not appear as plaintext in the underlying storage', async () => {
            type DocType = {
                id: string;
                secret: string;
                name: string;
            };
            const mySchema: RxJsonSchema<DocType> = {
                version: 0,
                primaryKey: 'id',
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        maxLength: 100
                    },
                    secret: {
                        type: 'string'
                    },
                    name: {
                        type: 'string'
                    }
                },
                required: ['id', 'secret', 'name'],
                encrypted: ['secret']
            };
            const db = await createRxDatabase<{ test: RxCollection<DocType>; }>({
                name: randomToken(10),
                storage,
                password: await getPassword()
            });
            const collections = await db.addCollections({
                test: { schema: mySchema }
            });

            const secretValue = 'super-secret-' + randomToken(20);
            await collections.test.insert({ id: 'doc1', secret: secretValue, name: 'Alice' });

            // Access the underlying storage (below encryption wrapper)
            const encryptedWrapper = (collections.test.storageInstance as any).originalStorageInstance;
            const rawStorage = encryptedWrapper.originalStorageInstance;
            const rawDocs = await rawStorage.findDocumentsById(['doc1'], false);

            assert.ok(rawDocs.length > 0, 'Document should exist in raw storage');
            const rawDoc = rawDocs[0];

            // The secret should NOT be visible as plaintext
            assert.notStrictEqual(rawDoc.secret, secretValue,
                'Secret value should be encrypted in raw storage');
            // The secret should be a string (encrypted ciphertext)
            assert.strictEqual(typeof rawDoc.secret, 'string',
                'Encrypted value should be a string');
            // The encrypted value should be different (longer) than the original
            assert.ok(rawDoc.secret.length > secretValue.length,
                'Encrypted ciphertext should be longer than plaintext');

            // The non-encrypted field should be in plaintext
            assert.strictEqual(rawDoc.name, 'Alice',
                'Non-encrypted field should be in plaintext');

            // Verify the public API returns decrypted data
            const doc = await collections.test.findOne('doc1').exec(true);
            assert.strictEqual(doc.secret, secretValue, 'Public API should return decrypted data');

            await db.remove();
        });
    });

    describe('encrypted nested field with non-string type and validator', () => {
        it('should work with encrypted nested boolean and validator', async () => {
            if (config.storage.hasEncryption) {
                return;
            }
            type DocType = {
                id: string;
                data: {
                    isSecret: boolean;
                    label: string;
                };
            };
            const mySchema: RxJsonSchema<DocType> = {
                version: 0,
                primaryKey: 'id',
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        maxLength: 100
                    },
                    data: {
                        type: 'object',
                        properties: {
                            isSecret: {
                                type: 'boolean'
                            },
                            label: {
                                type: 'string'
                            }
                        },
                        required: ['isSecret', 'label']
                    }
                },
                required: ['id', 'data'],
                encrypted: ['data.isSecret']
            };
            const db = await createRxDatabase<{ test: RxCollection<DocType>; }>({
                name: randomToken(10),
                storage: wrappedKeyEncryptionCryptoJsStorage({
                    storage: wrappedValidateAjvStorage({
                        storage: getRxStorageMemory()
                    })
                }),
                password: await getPassword()
            });
            const collections = await db.addCollections({
                test: { schema: mySchema }
            });

            await collections.test.insert({
                id: 'doc1',
                data: { isSecret: true, label: 'classified' }
            });
            const doc = await collections.test.findOne('doc1').exec(true);
            assert.strictEqual(doc.data.isSecret, true);
            assert.strictEqual(typeof doc.data.isSecret, 'boolean');

            // Update to false
            await doc.incrementalPatch({
                data: { isSecret: false, label: 'declassified' }
            });
            const doc2 = await collections.test.findOne('doc1').exec(true);
            assert.strictEqual(doc2.data.isSecret, false);
            assert.strictEqual(typeof doc2.data.isSecret, 'boolean');
            assert.strictEqual(doc2.data.label, 'declassified');

            await db.remove();
        });

        it('should work with encrypted object containing enum field and validator', async () => {
            if (config.storage.hasEncryption) {
                return;
            }
            type DocType = {
                id: string;
                metadata: {
                    level: number;
                    tags: string[];
                };
            };
            const mySchema: RxJsonSchema<DocType> = {
                version: 0,
                primaryKey: 'id',
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        maxLength: 100
                    },
                    metadata: {
                        type: 'object',
                        properties: {
                            level: {
                                type: 'integer',
                                minimum: 1,
                                maximum: 5
                            },
                            tags: {
                                type: 'array',
                                items: { type: 'string' }
                            }
                        },
                        required: ['level', 'tags']
                    }
                },
                required: ['id', 'metadata'],
                encrypted: ['metadata']
            };
            const db = await createRxDatabase<{ test: RxCollection<DocType>; }>({
                name: randomToken(10),
                storage: wrappedKeyEncryptionCryptoJsStorage({
                    storage: wrappedValidateAjvStorage({
                        storage: getRxStorageMemory()
                    })
                }),
                password: await getPassword()
            });
            const collections = await db.addCollections({
                test: { schema: mySchema }
            });

            await collections.test.insert({
                id: 'doc1',
                metadata: { level: 3, tags: ['secret', 'important'] }
            });
            const doc = await collections.test.findOne('doc1').exec(true);
            assert.strictEqual(doc.metadata.level, 3);
            assert.deepStrictEqual(doc.metadata.tags, ['secret', 'important']);

            await db.remove();
        });
    });

    describe('remove and re-query with encrypted fields', () => {
        it('should correctly remove encrypted documents', async () => {
            type DocType = {
                id: string;
                secret: string;
            };
            const mySchema: RxJsonSchema<DocType> = {
                version: 0,
                primaryKey: 'id',
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        maxLength: 100
                    },
                    secret: {
                        type: 'string'
                    }
                },
                required: ['id', 'secret'],
                encrypted: ['secret']
            };
            const db = await createRxDatabase<{ test: RxCollection<DocType>; }>({
                name: randomToken(10),
                storage,
                password: await getPassword()
            });
            const collections = await db.addCollections({
                test: { schema: mySchema }
            });

            await collections.test.insert({ id: 'doc1', secret: 'to-delete' });
            const doc = await collections.test.findOne('doc1').exec(true);
            await doc.remove();

            const deleted = await collections.test.findOne('doc1').exec();
            assert.strictEqual(deleted, null);

            const count = await collections.test.count().exec();
            assert.strictEqual(count, 0);

            await db.remove();
        });
    });
});
