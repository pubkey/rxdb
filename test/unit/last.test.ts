import assert from 'assert';
import {
    dbCount,
    // OPEN_POUCHDB_STORAGE_INSTANCES
} from '../../plugins/core';

describe('last.test.js', () => {
    it('ensure every db is cleaned up', () => {
        assert.strictEqual(dbCount(), 0);
    });
    it('ensure every storage instance is cleaned up', ()=> {
        // TODO fix this test
        // assert.strictEqual(OPEN_POUCHDB_STORAGE_INSTANCES.size, 0);
    });
});
