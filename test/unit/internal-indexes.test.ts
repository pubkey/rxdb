import assert from 'assert';
import { describeParallel } from './config.ts';
import {
    schemaObjects,
    schemas,
    humansCollection
} from '../../plugins/test-utils/index.mjs';
import {
    clone,
    deepEqual,
    normalizeMangoQuery,
    prepareQuery,
    getChangedDocumentsSinceQuery,
} from '../../plugins/core/index.mjs';


describeParallel('internal-indexes.test.js', () => {

    async function createCollectionWithInternalIndexes(internalIndexes: string[][], docsAmount: number = 0) {
        const schema = clone(schemas.human);
        schema.internalIndexes = internalIndexes;
        const collection = await humansCollection.createBySchema(
            schema,
            'docs'
        );
        if (docsAmount > 0) {
            const docsData = new Array(docsAmount)
                .fill(0)
                .map(() => schemaObjects.humanData());
            const writeResult = await collection.bulkInsert(docsData);
            assert.deepStrictEqual(writeResult.error, []);
        }
        return collection;
    }

    describe('creation', () => {
        it('should allow to use internal indexes and map them correctly', async () => {
            const myIdx = ['firstName', 'lastName'];
            const collection = await createCollectionWithInternalIndexes([myIdx]);
            const foundOnStorage = collection.internalStorageInstance.schema.indexes?.find(idx => deepEqual(idx, myIdx));
            assert.ok(foundOnStorage);
            collection.database.destroy();
        });
        it('should use the internalIndex in the query planner', async () => {
            const myIdx = ['firstName', 'lastName'];
            const collection = await createCollectionWithInternalIndexes([myIdx]);

            const preparedQuery = prepareQuery(
                collection.internalStorageInstance.schema,
                normalizeMangoQuery(
                    collection.internalStorageInstance.schema,
                    {
                        selector: {
                            firstName: 'a',
                            lastName: 'b'
                        }
                    }
                )
            );
            assert.deepStrictEqual(preparedQuery.queryPlan.index, ['firstName', 'lastName']);
            collection.database.remove();
        });
    });
    describe('usage', () => {
        it('should be able to run a query with an internal index explicitly set', async () => {
            const myIdx = ['firstName', 'lastName', 'passportId'];
            const collection = await createCollectionWithInternalIndexes([myIdx], 10);
            await collection.insert({
                passportId: 'foobar',
                firstName: 'alice',
                lastName: 'bob',
                age: 0
            });

            const preparedQuery = prepareQuery(
                collection.storageInstance.schema,
                normalizeMangoQuery(
                    collection.storageInstance.schema,
                    {
                        selector: {
                            firstName: 'alice',
                            lastName: 'bob'
                        },
                        index: myIdx
                    }
                )
            );
            const result = await collection.storageInstance.query(preparedQuery);
            assert.strictEqual(result.documents[0].passportId, 'foobar');

            collection.database.remove();
        });
        it('should pick up the intenral index in the query planner', async () => {
            const myIdx = ['firstName', 'lastName', 'passportId'];
            const collection = await createCollectionWithInternalIndexes([myIdx], 10);
            await collection.insert({
                passportId: 'foobar',
                firstName: 'alice',
                lastName: 'bob',
                age: 0
            });

            const preparedQuery = prepareQuery(
                collection.storageInstance.schema,
                normalizeMangoQuery(
                    collection.storageInstance.schema,
                    {
                        selector: {
                            firstName: 'alice',
                            lastName: 'bob'
                        }
                    }
                )
            );
            assert.deepStrictEqual(
                preparedQuery.queryPlan.index,
                [
                    'firstName',
                    'lastName',
                    'passportId'
                ]
            );
            const result = await collection.storageInstance.query(preparedQuery);
            assert.strictEqual(result.documents[0].passportId, 'foobar');

            collection.database.remove();
        });
    });
    describe('special case', () => {
        it('server must be able to iterate with additional fields', async () => {
            const myIdx = ['firstName', '_meta.lwt', 'passportId'];
            const collection = await createCollectionWithInternalIndexes([myIdx], 10);
            const writeResult = await collection.bulkInsert(new Array(10).fill(0).map(() => schemaObjects.humanData(undefined, undefined, 'alice')));
            assert.deepStrictEqual(writeResult.error, []);
            const query = getChangedDocumentsSinceQuery(
                collection.storageInstance,
                2
            );
            query.selector.firstName = { $eq: 'alice' };
            const preparedQuery = prepareQuery(
                collection.storageInstance.schema,
                query
            );
            assert.deepStrictEqual(preparedQuery.queryPlan.index, [
                'firstName',
                '_meta.lwt',
                'passportId'
            ]);

            const result = await collection.storageInstance.query(preparedQuery);
            result.documents.forEach(d => assert.strictEqual(d.firstName, 'alice'));

            collection.database.remove();
        });
    });
});
