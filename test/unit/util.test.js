/**
 * this tests the behaviour of util.js
 */
import assert from 'assert';
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
            const str = util.randomCouchString(10);
            const hash = util.fastUnsecureHash(str);
            const hash2 = util.fastUnsecureHash(str);
            assert.equal(hash, hash2);
        });
        it('should work with a very large string', async() => {
            const str = util.randomCouchString(5000);
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
            const value = util.randomCouchString(5000);
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
            const pwd = util.randomCouchString(5000);
            const encrypted = util.encrypt(value, pwd);
            const decrypted = util.decrypt(encrypted, pwd);
            assert.notEqual(value, encrypted);
            assert.ok(encrypted.length > value.length);
            assert.equal(typeof encrypted, 'string');
            assert.equal(value, decrypted);
        });
    });

    describe('.numberToLetter()', () => {
        it('1 letter', () => {
            assert.equal(util.numberToLetter(0), 'a');
            assert.equal(util.numberToLetter(1), 'b');
            assert.equal(util.numberToLetter(25), 'A');
        });
        it('2 letters', () => {
            assert.equal(util.numberToLetter(100), 'aT');
            assert.equal(util.numberToLetter(200), 'cB');
            assert.equal(util.numberToLetter(800), 'nX');
        });
        it('many letters', () => {
            assert.equal(util.numberToLetter(10000), 'b7z');
            assert.equal(util.numberToLetter(100000), 'DSi');
            assert.equal(util.numberToLetter(10000000), '2oMX');
        });
    });
    describe('.assertThrowsAsync()', () => {
        it('valid if function throws', async() => {
            const test = async function() {
                await util.promiseWait(1);
                throw new Error('foo');
            };
            await util.assertThrowsAsync(
                test,
                Error
            );
        });
        it('throw if function does not throw', async() => {
            const test = async function() {
                await util.promiseWait(1);
                return 1;
            };
            let thrown = false;
            try {
                await util.assertThrowsAsync(
                    test,
                    Error
                );
            } catch (e) {
                thrown = true;
            }
            assert.ok(thrown);
        });
        it('throw if no TypeError', async() => {
            const test = async function() {
                await util.promiseWait(1);
                throw new Error('foo');
            };
            let thrown = false;
            try {
                await util.assertThrowsAsync(
                    test,
                    TypeError
                );
            } catch (e) {
                thrown = true;
            }
            assert.ok(thrown);
        });
        it('throw if no Error', async() => {
            const test = async function() {
                await util.promiseWait(1);
                throw new TypeError('foo');
            };
            let thrown = false;
            try {
                await util.assertThrowsAsync(
                    test,
                    Error
                );
            } catch (e) {
                thrown = true;
            }
            assert.ok(thrown);
        });
        it('throw if not contains', async() => {
            const test = async function() {
                await util.promiseWait(1);
                throw new TypeError('foo');
            };
            let thrown = false;
            try {
                await util.assertThrowsAsync(
                    test,
                    TypeError,
                    'bar'
                );
            } catch (e) {
                thrown = true;
            }
            assert.ok(thrown);
        });
        it('dont throw if contains', async() => {
            const test = async function() {
                await util.promiseWait(1);
                throw new Error('foobar');
            };
            await util.assertThrowsAsync(
                test,
                Error,
                'oba'
            );
        });
    });
});
