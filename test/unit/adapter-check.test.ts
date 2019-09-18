import assert from 'assert';
import config from './config';
import RxDB from '../../dist/lib/index';
import PouchDB from '../../dist/lib/pouch-db';
import {
    POUCHDB_LOCATION
} from '../../dist/lib/plugins/adapter-check.js';
import {
    adapterObject
} from '../../dist/lib/util';

import memdown from 'memdown';
if (!config.platform.isNode())
    RxDB.plugin(require('pouchdb-adapter-idb'));

config.parallel('adapter-check.test.js', () => {
    describe('outcome', () => {
        it('should be true on memory', async () => {
            const ok = await RxDB.checkAdapter('memory');
            assert.ok(ok);

            const ok2 = await RxDB.checkAdapter('memory');
            assert.ok(ok2);
        });
        it('should be false on invalid string', async () => {
            const ok = await RxDB.checkAdapter('foobar');
            assert.equal(ok, false);
        });
        it('should be true on memdown (leveldb-adapter)', async () => {
            const ok = await RxDB.checkAdapter(memdown);
            assert.ok(ok);
        });
        it('localstorage should be true on browser', async () => {
            const should = config.platform.isNode() ? false : true;
            const ok = await RxDB.checkAdapter('idb');
            assert.equal(should, ok);
        });
    });
    describe('ISSUES', () => {
        it('#715 Cleanup checkAdapter test databases after use', async () => {
            const ok = await RxDB.checkAdapter(memdown);
            assert.ok(ok);

            // ensure the test-document is removed
            const pouch = new PouchDB(
                POUCHDB_LOCATION,
                adapterObject(memdown), {
                    auto_compaction: false, // no compaction because this only stores local documents
                    revs_limit: 1
                }
            );

            const found = await pouch.find({
                selector: {}
            });

            assert.equal(found.docs.length, 0);
        });
    });
});
