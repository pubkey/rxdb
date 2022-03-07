import assert from 'assert';
import config from './config';
import {
    adapterObject,
} from '../../';
import {
    PouchDB,
    addPouchPlugin,
    POUCHDB_LOCATION,
    checkAdapter
} from '../../plugins/pouchdb';

import memdown from 'memdown';
if (!config.platform.isNode()) {
    addPouchPlugin(require('pouchdb-adapter-idb'));
}

config.parallel('adapter-check.test.js', () => {
    if (config.storage.name !== 'pouchdb') {
        return;
    }
    describe('outcome', () => {
        it('should be true on memory', async () => {
            const ok2 = await checkAdapter('memory');
            assert.ok(ok2);
        });
        it('should be false on invalid string', async () => {
            const ok = await checkAdapter('foobar');
            assert.strictEqual(ok, false);
        });
        it('should be true on memdown (leveldb-adapter)', async () => {
            const ok = await checkAdapter(memdown);
            assert.ok(ok);
        });
        it('localstorage should be true on browser', async () => {
            const should = config.platform.isNode() ? false : true;
            const ok = await checkAdapter('idb');
            assert.strictEqual(should, ok);
        });
    });
    describe('ISSUES', () => {
        it('#715 Cleanup checkAdapter test databases after use', async () => {
            const ok = await checkAdapter(memdown);
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
