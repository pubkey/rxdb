import assert from 'assert';
import AsyncTestUtil from 'async-test-util';
import config, { describeParallel } from './config.ts';
import clone from 'clone';

import {
    schemaObjects,
    schemas,
    humansCollection,
    isNode
} from '../../plugins/test-utils/index.mjs';

import {
    isRxQuery,
    createRxDatabase,
    RxJsonSchema,
    promiseWait,
    randomCouchString,
    ensureNotFalsy,
    deepFreeze
} from '../../plugins/core/index.mjs';

import { firstValueFrom } from 'rxjs';

describe('aggregation.test.ts', () => {
    describe('$match', () => {
        it('should find the correct documents', async () => {
            const col = await humansCollection.create(10);

            const all = await col.aggregate([]);
            assert.strictEqual(all.length, 10);
            const firstId = all[0].passportId;

            const onlyFirst = await col.aggregate([
                { $match: { passportId: firstId } }
            ]);
            assert.ok(onlyFirst[0].passportId, firstId);

            const none = await col.aggregate([
                { $match: { passportId: 'foobar' } }
            ]);
            assert.strictEqual(none.length, 0);

            col.database.remove();
        });
    });
    describe('$match', () => {
        it('should find the correct documents', async () => {
            const col = await humansCollection.create(10);

            const all = await col.aggregate([]);
            assert.strictEqual(all.length, 10);
            const firstId = all[0].passportId;

            const onlyFirst = await col.aggregate([
                { $match: { passportId: firstId } }
            ]);
            assert.ok(onlyFirst[0].passportId, firstId);

            const none = await col.aggregate([
                { $match: { passportId: 'foobar' } }
            ]);
            assert.strictEqual(none.length, 0);

            col.database.remove();
        });
    });
    describe('$group', () => {
        it('should group correctly', async () => {
            const col = await humansCollection.create(0);
            await col.bulkInsert([
                schemaObjects.humanData(undefined, 10),
                schemaObjects.humanData(undefined, 10),
                schemaObjects.humanData(undefined, 10),
                schemaObjects.humanData(undefined, 10),
                schemaObjects.humanData(undefined, 20),
                schemaObjects.humanData(undefined, 20),
                schemaObjects.humanData(undefined, 20),
                schemaObjects.humanData(undefined, 30)
            ]);

            const groups = await col.aggregate<any>([{
                $group: {
                    _id: '$age',
                    age: { '$first': '$age' },
                    myCount: { $sum: 1 }
                }
            }]);
            assert.strictEqual(groups.length, 3);
            const group20 = groups.find(g => g._id === 20);
            assert.strictEqual(group20.age, 20);
            assert.strictEqual(group20.myCount, 3);

            col.database.remove();
        });
    });
    describe('$sort', () => {
        it('should $group and $sort correctly', async () => {
            const col = await humansCollection.create(0);
            await col.bulkInsert([
                schemaObjects.humanData(undefined, 10),
                schemaObjects.humanData(undefined, 10),
                schemaObjects.humanData(undefined, 10),
                schemaObjects.humanData(undefined, 10),
                schemaObjects.humanData(undefined, 20),
                schemaObjects.humanData(undefined, 20),
                schemaObjects.humanData(undefined, 20),
                schemaObjects.humanData(undefined, 30)
            ]);

            const result = await col.aggregate<any>([
                {
                    $group: {
                        _id: '$age',
                        age: { '$first': '$age' },
                        myCount: { $sum: 1 }
                    }
                },
                {
                    $sort: { myCount: 1 }
                }
            ]);
            assert.strictEqual(result[0].age, 30);
            col.database.remove();
        });
    });

});
