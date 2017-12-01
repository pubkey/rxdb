import assert from 'assert';
import config from './config';
import RxDB from '../../dist/lib/index';

import memdown from 'memdown';
if (!config.platform.isNode())
    RxDB.plugin(require('pouchdb-adapter-localstorage'));

describe('adapter-check.test.js', () => {
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
        const ok = await RxDB.checkAdapter('localstorage');
        assert.equal(should, ok);
    });
});
