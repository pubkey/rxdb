/**
 * this tests the behaviour of util.js
 */
import assert from 'assert';
import AsyncTestUtil from 'async-test-util';
import * as util from '../../dist/lib/util';
import {
    validateCouchDBString
} from '../../dist/lib/pouch-db';


describe('util.test.js', () => {
    describe('.fastUnsecureHash()', () => {
        it('should work with a string', () => {
            const hash = util.fastUnsecureHash('foobar');
            assert.strictEqual(typeof hash, 'number');
            assert.ok(hash > 0);
        });
        it('should work on object', () => {
            const hash = util.fastUnsecureHash({
                foo: 'bar'
            });
            assert.strictEqual(typeof hash, 'number');
            assert.ok(hash > 0);
        });
        it('should get the same hash twice', () => {
            const str = util.randomCouchString(10);
            const hash = util.fastUnsecureHash(str);
            const hash2 = util.fastUnsecureHash(str);
            assert.strictEqual(hash, hash2);
        });
        it('should work with a very large string', () => {
            const str = util.randomCouchString(5000);
            const hash = util.fastUnsecureHash(str);
            assert.strictEqual(typeof hash, 'number');
            assert.ok(hash > 0);
        });
    });
    describe('.sortObject()', () => {
        it('should sort when regex in object', () => {
            const obj = {
                _id: {},
                color: {
                    '$regex': /foobar/g
                }
            };
            const sorted = util.sortObject(obj);
            assert.ok(sorted.color.$regex instanceof RegExp);
        });
    });
    describe('.validateCouchDBString()', () => {
        describe('positive', () => {
            it('should validate a normal string', () => {
                validateCouchDBString('foobar');
            });
            it('should allow _ and $ after the first character', () => {
                validateCouchDBString('foo_bar');
                validateCouchDBString('foobar_');
                validateCouchDBString('foobar$');
            });
            it('should not allow _ and $ as the first character', async () => {
                await AsyncTestUtil.assertThrows(
                    () => validateCouchDBString('$foobar'),
                    'RxError',
                    'match the regex'
                );
                await AsyncTestUtil.assertThrows(
                    () => validateCouchDBString('_foobar'),
                    'RxError',
                    'match the regex'
                );
            });
            it('should validate foldernames', () => {
                validateCouchDBString('./foobar'); // unix
                validateCouchDBString('.\\foobar'); // windows
            });
        });
        describe('negative', () => {
            it('should not validate a spaced string', async () => {
                await AsyncTestUtil.assertThrows(
                    () => validateCouchDBString('foo bar'),
                    'RxError',
                    'match the regex'
                );
            });
        });
    });
});
