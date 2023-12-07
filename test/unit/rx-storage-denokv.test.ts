import assert from 'assert';

import config from './config.ts';
import {
    clone,
    ensureNotFalsy,
    fillWithDefaultSettings,
    MangoQuery,
    normalizeMangoQuery,
    randomCouchString,
    now,
    createRevision
} from '../../plugins/core/index.mjs';

import {
    getDenoGlobal
} from '../../plugins/storage-denokv/index.mjs';

import * as schemaObjects from '../helper/schema-objects.ts';
import {
    HumanDocumentType,
    humanSchemaLiteral
} from '../helper/schemas.ts';

/**
 * RxStorageDexie specific tests
 */
config.parallel('rx-storage-denokv.test.js', () => {
    if (config.storage.name !== 'denokv') {
        return;
    }
    function getDenoKV() {
        return getDenoGlobal().openKv();
    }
    describe('ensure correct assumptions of the api', () => {
        it('must be able to detect on-insert conflicts', async () => {
            const kv = await getDenoKV();

            const key = [randomCouchString(10)];

            // should work if not exits
            const txResult = await kv.atomic()
                .check({ key })
                .set(key, 1)
                .commit();
            assert.ok(txResult.ok);

            // should error on conflict
            const txResult2 = await kv.atomic()
                .check({ key })
                .set(key, 1)
                .commit();
            assert.strictEqual(txResult2.ok, false);

            kv.close();
        });
    });
});
