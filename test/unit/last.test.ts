import assert from 'assert';
import {
    dbCount
} from '../../plugins/core';

describe('last.test.js', () => {
    it('ensure every db is cleaned up', () => {
        assert.strictEqual(dbCount(), 0);
    });
});
