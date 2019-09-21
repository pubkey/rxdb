import assert from 'assert';
import RxDB from '../../';

describe('last.test.js', () => {
    it('ensure every db is cleaned up', async () => {
        assert.equal(RxDB.dbCount(), 0);
    });
});
