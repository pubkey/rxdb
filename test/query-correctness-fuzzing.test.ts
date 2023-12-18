import {
    createRxDatabase,
    randomCouchString,
    overwritable,
    requestIdlePromise
} from '../plugins/core/index.mjs';
import * as assert from 'assert';
import * as schemas from './helper/schemas.ts';
import * as schemaObjects from './helper/schema-objects.ts';
import config from './unit/config.ts';
import { randomBoolean, randomNumber, wait } from 'async-test-util';
import { randomStringWithSpecialChars } from './helper/schema-objects.ts';
import {
    random
} from 'event-reduce-js'
/**
 * Creates random writes, indexes and querys and tests if the results are correct.
 */

/**
 * Do not use a too height value
 * so that it more often triggers sort changes.
 */
export const HUMAN_MAX_AGE = 20;
export interface Human {
    _id: string; // primary
    name: string;
    gender: 'm' | 'f';
    age: number;
}
export function randomHuman(partial?: Partial<Human>): Human {
    const ret: Human = {
        _id: randomStringWithSpecialChars(10),
        name: randomStringWithSpecialChars(10),
        gender: randomBoolean() ? 'f' : 'm',
        age: randomNumber(1, HUMAN_MAX_AGE)
    };
    if (partial) {
        Object.entries(partial).forEach(([k, v]) => {
            (ret as any)[k] = v;
        });
    }
    return ret;
}


describe('query-correctness-fuzzing.test.ts', () => {
    it('init storage', async () => {
        if (config.storage.init) {
            await config.storage.init();
        }
    });
});
