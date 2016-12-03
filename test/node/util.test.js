/**
 * this tests the behaviour of util.js
 */
import assert from 'assert';
import {
    default as randomToken
} from 'random-token';

import * as util from '../../dist/lib/util';


describe('util.test.js', () => {
    describe('.fastUnsecureHash()', () => {
        it('should work with a string', async() => {
            const hash = util.fastUnsecureHash('foobar');
            assert.equal(typeof hash, 'number');
            assert.ok(hash > 0);
        });
        it('should work on object', async() => {
            const hash = util.fastUnsecureHash({
                foo: 'bar'
            });
            assert.equal(typeof hash, 'number');
            assert.ok(hash > 0);
        });
        it('should get the same hash twice', async() => {
            const str = randomToken(10);
            const hash = util.fastUnsecureHash(str);
            const hash2 = util.fastUnsecureHash(str);
            assert.equal(hash, hash2);
        });
        it('should work with a very large string', async() => {
            const str = randomToken(5000);
            const hash = util.fastUnsecureHash(str);
            assert.equal(typeof hash, 'number');
            assert.ok(hash > 0);
        });
    });
    describe('.encrypt()', () => {
        it('should encrypt properly', () => {
            const value = 'foobar';
            const pwd = 'pwd';
            const encrypted = util.encrypt(value, pwd);
            assert.notEqual(value, encrypted);
            assert.ok(encrypted.length > value.length);
            assert.equal(typeof encrypted, 'string');
        });
        it('should decrypt properly', () => {
            const value = 'foobar';
            const pwd = 'pwd';
            const encrypted = util.encrypt(value, pwd);
            const decrypted = util.decrypt(encrypted, pwd);
            assert.notEqual(decrypted, encrypted);
            assert.equal(value, decrypted);
        });
        it('should encrypt and decrypt an extremly long string', () => {
            const value = randomToken(5000);
            const pwd = 'pwd';
            const encrypted = util.encrypt(value, pwd);
            const decrypted = util.decrypt(encrypted, pwd);
            assert.notEqual(value, encrypted);
            assert.ok(encrypted.length > value.length);
            assert.equal(typeof encrypted, 'string');
            assert.equal(value, decrypted);
        });
        it('should encrypt and decrypt an extremly long password', () => {
            const value = 'foobar';
            const pwd = randomToken(5000);
            const encrypted = util.encrypt(value, pwd);
            const decrypted = util.decrypt(encrypted, pwd);
            assert.notEqual(value, encrypted);
            assert.ok(encrypted.length > value.length);
            assert.equal(typeof encrypted, 'string');
            assert.equal(value, decrypted);
        });
    });
});
