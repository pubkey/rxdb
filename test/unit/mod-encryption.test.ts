/**
 * test agains the encryption-module
 * @file src/plugins/encryption.js
 */
import assert from 'assert';
import {
    decrypt,
    encrypt
} from '../../plugins/encryption';
import { randomCouchString } from '../../plugins/core';

describe('mod-encrytion.test.js : .encrypt()', () => {
    it('should encrypt properly', () => {
        const value = 'foobar';
        const pwd = 'pwd';
        const encrypted = encrypt(value, pwd);
        assert.notStrictEqual(value, encrypted);
        assert.ok(encrypted.length > value.length);
        assert.strictEqual(typeof encrypted, 'string');
    });
    it('should decrypt properly', () => {
        const value = 'foobar';
        const pwd = 'pwd';
        const encrypted = encrypt(value, pwd);
        const decrypted = decrypt(encrypted, pwd);
        assert.notStrictEqual(decrypted, encrypted);
        assert.strictEqual(value, decrypted);
    });
    it('should encrypt and decrypt an extremly long string', () => {
        const value = randomCouchString(5000);
        const pwd = 'pwd';
        const encrypted = encrypt(value, pwd);
        const decrypted = decrypt(encrypted, pwd);
        assert.notStrictEqual(value, encrypted);
        assert.ok(encrypted.length > value.length);
        assert.strictEqual(typeof encrypted, 'string');
        assert.strictEqual(value, decrypted);
    });
    it('should encrypt and decrypt an extremly long password', () => {
        const value = 'foobar';
        const pwd = randomCouchString(5000);
        const encrypted = encrypt(value, pwd);
        const decrypted = decrypt(encrypted, pwd);
        assert.notStrictEqual(value, encrypted);
        assert.ok(encrypted.length > value.length);
        assert.strictEqual(typeof encrypted, 'string');
        assert.strictEqual(value, decrypted);
    });
});
