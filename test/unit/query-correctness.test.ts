import assert from 'assert';
import {
    clone
} from 'async-test-util';

import config from './config';
import * as schemas from '../helper/schemas';
import {
    RxJsonSchema,
    RxDocumentData,
    fillWithDefaultSettings,
    randomCouchString,
    createRxDatabase
} from '../../';

config.parallel('query-correctness.test.js', () => {

    type TestDoc = {
        id: string;
        age: number;
    }
    const schema: RxJsonSchema<TestDoc> = {
        version: 0,
        primaryKey: 'id',
        type: 'object',
        properties: {
            id: {
                type: 'string',
                maxLength: 100
            },
            age: {
                type: 'number',
                minimum: 100,
                maximum: 200,
                multipleOf: 1
            }
        },
        required: [
            'id',
            'age'
        ],
        indexes: [
            'age'
        ]
    };

    async function getTestCollection() {
        const db = await createRxDatabase({
            name: randomCouchString(10),
            storage: config.storage.getStorage(),
        });
        await db.addCollections({
            docs: {
                schema
            }
        });
        return db.docs;
    }

    describe('$gt', () => {
        it('should find correct if the $gt value is lower then the minimum or higher then the maximum', async () => {
            const collection = await getTestCollection();

            await collection.insert({
                id: 'A',
                age: 100
            });
            await collection.insert({
                id: 'B',
                age: 150
            });
            await collection.insert({
                id: 'C',
                age: 200
            });

            const lowerThenMin = await collection.find({
                selector: {
                    age: {
                        $gt: 1
                    }
                }
            }).exec();
            assert.strictEqual(
                lowerThenMin.length,
                3
            );

            const higherThenMax = await collection.find({
                selector: {
                    age: {
                        $gt: 300
                    }
                }
            }).exec();
            assert.strictEqual(
                higherThenMax.length,
                0
            );
            collection.database.destroy();
        });
    });
    describe('$lt', () => {
        it('should find correct if the $lt value is lower then the minimum or higher then the maximum', async () => {
            const collection = await getTestCollection();

            await collection.insert({
                id: 'A',
                age: 100
            });
            await collection.insert({
                id: 'B',
                age: 150
            });
            await collection.insert({
                id: 'C',
                age: 200
            });

            const lowerThenMin = await collection.find({
                selector: {
                    age: {
                        $lt: 1
                    }
                }
            }).exec();
            assert.strictEqual(
                lowerThenMin.length,
                0
            );

            const higherThenMax = await collection.find({
                selector: {
                    age: {
                        $lt: 300
                    }
                }
            }).exec();
            assert.strictEqual(
                higherThenMax.length,
                3
            );
            collection.database.destroy();
        });
    });
});
