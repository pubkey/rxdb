import assert from 'assert';
import config from './config';
import * as RxDB from '../../plugins/core';
import {
    PouchDB,
    addRxPlugin,
    adapterObject
} from '../../plugins/core';
import {
    RxDBAdapterCheckPlugin,
    POUCHDB_LOCATION
} from '../../plugins/adapter-check';
addRxPlugin(RxDBAdapterCheckPlugin);

import memdown from 'memdown';
if (!config.platform.isNode()) {
    addRxPlugin(require('pouchdb-adapter-idb'));
}

config.parallel('adapter-check.test.js', () => {
    describe('outcome', () => {
        it('should be true on memory', async () => {
            const ok2 = await RxDB.checkAdapter('memory');
            assert.ok(ok2);
        });
        it('should be false on invalid string', async () => {
            const ok = await RxDB.checkAdapter('foobar');
            assert.strictEqual(ok, false);
        });
        it('should be true on memdown (leveldb-adapter)', async () => {
            const ok = await RxDB.checkAdapter(memdown);
            assert.ok(ok);
        });
        it('localstorage should be true on browser', async () => {
            const should = config.platform.isNode() ? false : true;
            const ok = await RxDB.checkAdapter('idb');
            assert.strictEqual(should, ok);
        });
    });
    describe('ISSUES', () => {
        it('#715 Cleanup checkAdapter test databases after use', async () => {
            const ok = await RxDB.checkAdapter(memdown);
            assert.ok(ok);

            // ensure the test-document is removed
            const pouch = new (PouchDB as any)(
                POUCHDB_LOCATION,
                adapterObject(memdown) as any,
                {
                    auto_compaction: false, // no compaction because this only stores local documents
                    revs_limit: 1
                }
            );

            const found = await pouch.find({
                selector: {}
            });

            assert.strictEqual(found.docs.length, 0);
        });
    });
});
