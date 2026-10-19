import assert from 'assert';
import { assertThrows } from 'async-test-util';

import config from './config.ts';
import {
    schemaObjects,
    schemas
} from '../../plugins/test-utils/index.mjs';
import {
    addRxPlugin,
    createRxDatabase,
    randomToken
} from '../../plugins/core/index.mjs';
import { RxDBLocalDocumentsPlugin } from '../../plugins/local-documents/index.mjs';
import {
    wrappedValidateAjvStandaloneStorage,
    getStandaloneValidationSchema
} from '../../plugins/validate-ajv-standalone/index.mjs';
import { compileAjvStandaloneValidators as compileValidators } from '../helper/ajv-standalone.ts';

addRxPlugin(RxDBLocalDocumentsPlugin);

describe('validate-ajv-standalone.test.ts', () => {
    /**
     * Use the storage without any other validation wrapper
     * so that only the standalone validators can reject documents.
     */
    it('should insert valid documents and reject invalid ones', async () => {
        const db = await createRxDatabase({
            name: randomToken(10),
            storage: wrappedValidateAjvStandaloneStorage({
                storage: config.storage.getPerformanceStorage().storage,
                validatorBySchemaHash: await compileValidators([schemas.human])
            })
        });
        const collections = await db.addCollections({
            human: {
                schema: schemas.human
            }
        });
        await collections.human.insert(schemaObjects.humanData());

        const human: any = schemaObjects.humanData();
        delete human.firstName;
        await assertThrows(
            () => collections.human.insert(human),
            'RxError',
            'firstName'
        );
        assert.strictEqual(await collections.human.count().exec(), 1);
        await db.close();
    });
    it('should use the same hash as the RxSchema of the collection', async () => {
        const { hash } = await getStandaloneValidationSchema(schemas.human);
        const db = await createRxDatabase({
            name: randomToken(10),
            storage: wrappedValidateAjvStandaloneStorage({
                storage: config.storage.getPerformanceStorage().storage,
                validatorBySchemaHash: await compileValidators([schemas.human])
            })
        });
        const collections = await db.addCollections({
            human: {
                schema: schemas.human
            }
        });
        assert.strictEqual(await collections.human.schema.hash, hash);
        await db.close();
    });
    it('should throw VD3 when no validator exists for the schema hash', async () => {
        const db = await createRxDatabase({
            name: randomToken(10),
            storage: wrappedValidateAjvStandaloneStorage({
                storage: config.storage.getPerformanceStorage().storage,
                validatorBySchemaHash: await compileValidators([schemas.human])
            })
        });
        await assertThrows(
            () => db.addCollections({
                point: {
                    schema: schemas.point
                }
            }),
            'RxError',
            'VD3'
        );
        await db.close();
    });
    it('should not require validators for the RxDB internal storage instances', async () => {
        const db = await createRxDatabase({
            name: randomToken(10),
            storage: wrappedValidateAjvStandaloneStorage({
                storage: config.storage.getPerformanceStorage().storage,
                validatorBySchemaHash: await compileValidators([schemas.human])
            }),
            localDocuments: true
        });
        const collections = await db.addCollections({
            human: {
                schema: schemas.human,
                localDocuments: true
            }
        });
        await db.insertLocal('foo', { bar: 1 });
        await collections.human.insertLocal('foo', { bar: 2 });
        const localDoc = await collections.human.getLocal<{ bar: number; }>('foo');
        assert.strictEqual(localDoc?.get('bar'), 2);
        await db.close();
    });
    describe('multiple schemas', () => {
        it('should use the matching validator for each collection', async () => {
            const db = await createRxDatabase({
                name: randomToken(10),
                storage: wrappedValidateAjvStandaloneStorage({
                    storage: config.storage.getPerformanceStorage().storage,
                    validatorBySchemaHash: await compileValidators([
                        schemas.human,
                        schemas.point,
                        schemas.nestedHuman
                    ])
                })
            });
            const collections = await db.addCollections({
                human: {
                    schema: schemas.human
                },
                point: {
                    schema: schemas.point
                },
                nested: {
                    schema: schemas.nestedHuman
                }
            });

            await collections.human.insert(schemaObjects.humanData());
            await collections.point.insert(schemaObjects.pointData());
            await collections.nested.insert(schemaObjects.nestedHumanData());

            const brokenPoint: any = schemaObjects.pointData();
            brokenPoint.x = 'not-a-number';
            await assertThrows(
                () => collections.point.insert(brokenPoint),
                'RxError',
                'VD2'
            );
            const brokenNested: any = schemaObjects.nestedHumanData();
            brokenNested.mainSkill.level = 'not-a-number';
            await assertThrows(
                () => collections.nested.insert(brokenNested),
                'RxError',
                'VD2'
            );

            /**
             * A point document must not pass the validator of the human schema
             * and the other way round.
             */
            await assertThrows(
                () => collections.human.insert(schemaObjects.pointData() as any),
                'RxError',
                'VD2'
            );
            await assertThrows(
                () => collections.point.insert(schemaObjects.humanData() as any),
                'RxError',
                'VD2'
            );

            assert.strictEqual(await collections.human.count().exec(), 1);
            assert.strictEqual(await collections.point.count().exec(), 1);
            assert.strictEqual(await collections.nested.count().exec(), 1);
            await db.close();
        });
        it('should throw VD3 for the one schema that has no validator', async () => {
            const db = await createRxDatabase({
                name: randomToken(10),
                storage: wrappedValidateAjvStandaloneStorage({
                    storage: config.storage.getPerformanceStorage().storage,
                    validatorBySchemaHash: await compileValidators([
                        schemas.human,
                        schemas.point
                    ])
                })
            });
            await db.addCollections({
                human: {
                    schema: schemas.human
                },
                point: {
                    schema: schemas.point
                }
            });
            await assertThrows(
                () => db.addCollections({
                    nested: {
                        schema: schemas.nestedHuman
                    }
                }),
                'RxError',
                'VD3'
            );
            await db.close();
        });
    });
    describe('multiple instances with the same schema', () => {
        it('should validate multiple collections of the same database that use the same schema', async () => {
            const db = await createRxDatabase({
                name: randomToken(10),
                storage: wrappedValidateAjvStandaloneStorage({
                    storage: config.storage.getPerformanceStorage().storage,
                    validatorBySchemaHash: await compileValidators([schemas.human])
                })
            });
            const collections = await db.addCollections({
                humansA: {
                    schema: schemas.human
                },
                humansB: {
                    schema: schemas.human
                }
            });
            for (const collection of [collections.humansA, collections.humansB]) {
                await collection.insert(schemaObjects.humanData());
                const human: any = schemaObjects.humanData();
                delete human.firstName;
                await assertThrows(
                    () => collection.insert(human),
                    'RxError',
                    'VD2'
                );
                assert.strictEqual(await collection.count().exec(), 1);
            }
            await db.close();
        });
        it('should validate in multiple databases that share the same wrapped storage and schema', async () => {
            const storage = wrappedValidateAjvStandaloneStorage({
                storage: config.storage.getPerformanceStorage().storage,
                validatorBySchemaHash: await compileValidators([schemas.human])
            });
            const databases = await Promise.all(
                new Array(3).fill(0).map(() => createRxDatabase({
                    name: randomToken(10),
                    storage
                }))
            );
            for (const db of databases) {
                const collections = await db.addCollections({
                    human: {
                        schema: schemas.human
                    }
                });
                await collections.human.insert(schemaObjects.humanData());
                const human: any = schemaObjects.humanData();
                human.age = 'not-a-number';
                await assertThrows(
                    () => collections.human.insert(human),
                    'RxError',
                    'VD2'
                );
                assert.strictEqual(await collections.human.count().exec(), 1);
            }
            await Promise.all(databases.map(db => db.close()));
        });
        it('should work when multiple wrapped storages get their own validator maps for the same schema', async () => {
            const [validatorsA, validatorsB] = await Promise.all([
                compileValidators([schemas.human]),
                compileValidators([schemas.human])
            ]);
            const dbA = await createRxDatabase({
                name: randomToken(10),
                storage: wrappedValidateAjvStandaloneStorage({
                    storage: config.storage.getPerformanceStorage().storage,
                    validatorBySchemaHash: validatorsA
                })
            });
            const dbB = await createRxDatabase({
                name: randomToken(10),
                storage: wrappedValidateAjvStandaloneStorage({
                    storage: config.storage.getPerformanceStorage().storage,
                    validatorBySchemaHash: validatorsB
                })
            });
            for (const db of [dbA, dbB]) {
                const collections = await db.addCollections({
                    human: {
                        schema: schemas.human
                    }
                });
                await collections.human.insert(schemaObjects.humanData());
                const human: any = schemaObjects.humanData();
                delete human.lastName;
                await assertThrows(
                    () => collections.human.insert(human),
                    'RxError',
                    'VD2'
                );
            }
            await Promise.all([dbA.close(), dbB.close()]);
        });
        it('should throw VD3 in a storage without the validator even when another storage already used the same schema', async () => {
            const dbWithValidator = await createRxDatabase({
                name: randomToken(10),
                storage: wrappedValidateAjvStandaloneStorage({
                    storage: config.storage.getPerformanceStorage().storage,
                    validatorBySchemaHash: await compileValidators([schemas.human])
                })
            });
            const collections = await dbWithValidator.addCollections({
                human: {
                    schema: schemas.human
                }
            });
            await collections.human.insert(schemaObjects.humanData());

            const dbWithoutValidator = await createRxDatabase({
                name: randomToken(10),
                storage: wrappedValidateAjvStandaloneStorage({
                    storage: config.storage.getPerformanceStorage().storage,
                    validatorBySchemaHash: await compileValidators([schemas.point])
                })
            });
            await assertThrows(
                () => dbWithoutValidator.addCollections({
                    human: {
                        schema: schemas.human
                    }
                }),
                'RxError',
                'VD3'
            );
            await Promise.all([dbWithValidator.close(), dbWithoutValidator.close()]);
        });
    });
});
