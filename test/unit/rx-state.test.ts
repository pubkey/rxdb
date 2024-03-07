import assert from 'assert';
import AsyncTestUtil, { randomBoolean, wait } from 'async-test-util';
import { Observable } from 'rxjs';

import config, { describeParallel } from './config.ts';
import {
    schemaObjects,
    schemas,
    humansCollection,
    isFastMode,
    isNode
} from '../../plugins/test-utils/index.mjs';

import {
    createRxDatabase,
    createRxSchema,
    randomCouchString,
    promiseWait,
    getDocumentOrmPrototype,
    getDocumentPrototype,
    addRxPlugin,
    RxCollection,
    createBlob,
    defaultHashSha256,
    RxJsonSchema
} from '../../plugins/core/index.mjs';

import {
    nextRxStateId,
    RxDBStatePlugin
} from '../../plugins/state/index.mjs';
addRxPlugin(RxDBStatePlugin);

import { RxDBAttachmentsPlugin } from '../../plugins/attachments/index.mjs';
addRxPlugin(RxDBAttachmentsPlugin);
import { RxDBJsonDumpPlugin } from '../../plugins/json-dump/index.mjs';
addRxPlugin(RxDBJsonDumpPlugin);

describe('rx-state.test.ts', () => {
    async function getState(
        databaseName: string = randomCouchString(10),
        prefix?: string,
    ) {
        const database = await createRxDatabase({
            name: databaseName,
            storage: config.storage.getStorage(),
            ignoreDuplicate: true
        });
        const state = await database.addState(prefix);
        return state;
    }
    function plusOne(v: number): number {
        return v + 1;
    }

    describe('helper', () => {
        describe('.nextRxStateId()', () => {
            it('should increment in sort order', () => {
                const ids: string[] = [];
                let t = 1000;
                let current = nextRxStateId();
                ids.push(current);
                while (t > 0) {
                    t--;
                    current = nextRxStateId(current);
                    ids.push(current);
                }

                const sorted = ids.slice(0).sort();
                assert.deepStrictEqual(ids, sorted);
            });
        });
    });
    describe('write state data', () => {
        it('should write without error', async () => {
            const state = await getState();
            await state.set('foo', () => 'bar');
            assert.strictEqual(state.foo, 'bar');
            state.collection.database.destroy();
        });
        it('write multiple times at once', async () => {
            const state = await getState();
            await state.set('a', () => 0);
            await Promise.all(
                new Array(10).fill(0).map(() => state.set('a', plusOne))
            );
            assert.strictEqual(state.get('a'), 10);
            state.collection.database.destroy();
        });
        it('write with two states at once', async () => {
            const databaseName = randomCouchString(10);
            const state1 = await getState(databaseName);
            const state2 = await getState(databaseName);
            await state1.set('a', () => 0);
            await Promise.all([
                state1.set('a', plusOne),
                state2.set('a', plusOne),
            ]);
            assert.strictEqual(state1.a, 2);
            assert.strictEqual(state2.a, 2);
            state1.collection.database.destroy();
            state2.collection.database.destroy();
        });
        it('should not have a deterministic output when 2 instances write at the same time', async () => {
            const databaseName = randomCouchString(10);
            const state1 = await getState(databaseName);
            const state2 = await getState(databaseName);

            await state1.set('a', () => 0);

            let t = 0;
            const amount = 100;
            const promises: Promise<any>[] = [];
            while (t < amount) {
                t++;
                promises.push(state1.set('a', plusOne));
                promises.push(state2.set('a', plusOne));
                if (randomBoolean() && randomBoolean()) {
                    await wait(0);
                }
            }
            await Promise.all(promises);

            const valueAfter = state1.get('a');
            assert.strictEqual(valueAfter, amount * 2);

            state1.collection.database.destroy();
            state2.collection.database.destroy();
        });

    });

});
