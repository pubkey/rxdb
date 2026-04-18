/**
 * this is a template for a test.
 * If you found a bug, edit this test to reproduce it
 * and than make a pull-request with that failing test.
 * The maintainer will later move your test to the correct position in the test-suite.
 *
 * To run this test do:
 * - 'npm run test:node' so it runs in nodejs
 * - 'npm run test:browser' so it runs in the browser
 */
import assert from 'assert';
import { wait } from 'async-test-util';
import config from './config.ts';
import {
    createRxDatabase,
    randomToken,
    RxCollection
} from '../../plugins/core/index.mjs';

const mySchema = {
    version: 0,
    primaryKey: 'passportId',
    type: 'object',
    properties: {
        passportId: { type: 'string', maxLength: 100 },
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        age: { type: 'integer', minimum: 0, maximum: 150 }
    }
} as const;

type HumanDoc = {
    passportId: string;
    firstName: string;
    lastName: string;
    age: number;
};

describe('bug-report.test.js', () => {
    if (!config.storage.hasMultiInstance) {
        it('skip (no multi-instance)', () => { });
        return;
    }
    it('multiInstance:false should NOT propagate events across instances with the same name', async () => {
        const name = randomToken(10);
        const db1 = await createRxDatabase<{ foo: RxCollection<HumanDoc>; }>({
            name,
            storage: config.storage.getStorage(),
            eventReduce: true,
            ignoreDuplicate: true,
            multiInstance: false
        });
        await db1.addCollections({
            foo: { schema: mySchema }
        });

        const db2 = await createRxDatabase<{ foo: RxCollection<HumanDoc>; }>({
            name,
            storage: config.storage.getStorage(),
            eventReduce: true,
            ignoreDuplicate: true,
            multiInstance: false
        });
        await db2.addCollections({
            foo: { schema: mySchema }
        });

        const emitted: any[] = [];
        const sub = db2.foo.$.subscribe(ev => {
            emitted.push(ev.documentId);
        });

        await db1.foo.insert({ passportId: 'a', firstName: 'A', lastName: 'X', age: 1 });
        // wait enough time for an event to propagate if it were going to
        await wait(300);

        assert.strictEqual(
            emitted.length,
            0,
            'With multiInstance:false, events must not propagate to other db instances'
        );

        sub.unsubscribe();
        await db1.close();
        await db2.close();
    });
});
