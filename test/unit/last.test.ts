import assert from 'assert';
import RxDB from '../../';

describe('last.test.js', () => {
    it('ensure every db is cleaned up', async () => {
        assert.strictEqual(RxDB.dbCount(), 0);
    });
});
