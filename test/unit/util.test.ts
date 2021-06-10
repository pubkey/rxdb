/**
 * this tests the behaviour of util.js
 */
import assert from 'assert';
import AsyncTestUtil from 'async-test-util';
import {
    fastUnsecureHash,
    randomCouchString,
    sortObject,
    now
} from '../../plugins/core';

import {
    validateDatabaseName
} from '../../plugins/dev-mode';

describe('util.test.js', () => {
    describe('.fastUnsecureHash()', () => {
        it('should work with a string', () => {
            const hash = fastUnsecureHash('foobar');
            assert.strictEqual(typeof hash, 'number');
            assert.ok(hash > 0);
        });
        it('should work on object', () => {
            const hash = fastUnsecureHash({
                foo: 'bar'
            });
            assert.strictEqual(typeof hash, 'number');
            assert.ok(hash > 0);
        });
        it('should get the same hash twice', () => {
            const str = randomCouchString(10);
            const hash = fastUnsecureHash(str);
            const hash2 = fastUnsecureHash(str);
            assert.strictEqual(hash, hash2);
        });
        it('should work with a very large string', () => {
            const str = randomCouchString(5000);
            const hash = fastUnsecureHash(str);
            assert.strictEqual(typeof hash, 'number');
            assert.ok(hash > 0);
        });
    });
    describe('.sortObject()', () => {
        it('should sort when regex in object', () => {
            const obj = {
                color: {
                    '$regex': /foobar/g
                }
            };
            const sorted = sortObject(obj);
            assert.ok(sorted.color.$regex instanceof RegExp);
        });
    });
    describe('.validateCouchDBString()', () => {
        describe('positive', () => {
            it('should validate a normal string', () => {
                validateDatabaseName('foobar');
            });
            it('should allow _ and $ after the first character', () => {
                validateDatabaseName('foo_bar');
                validateDatabaseName('foobar_');
                validateDatabaseName('foobar$');
            });
            it('should not allow _ and $ as the first character', async () => {
                await AsyncTestUtil.assertThrows(
                    () => validateDatabaseName('$foobar'),
                    'RxError',
                    'UT2'
                );
                await AsyncTestUtil.assertThrows(
                    () => validateDatabaseName('_foobar'),
                    'RxError',
                    'UT2'
                );
            });
            it('should validate foldernames', () => {
                validateDatabaseName('./foobar'); // unix
                validateDatabaseName('.\\foobar'); // windows
            });
        });
        describe('negative', () => {
            it('should not validate a spaced string', async () => {
                await AsyncTestUtil.assertThrows(
                    () => validateDatabaseName('foo bar'),
                    'RxError',
                    'UT2'
                );
            });
        });
    });
    describe('.now()', () => {
        it('should increase the returned value each time', () => {
            const values: number[] = [];
            new Array(100)
                .fill(0)
                .forEach(() => {
                    values.push(now());
                });

            let last = 0;
            values.forEach(value => {
                assert.ok(value > last);
                last = value;
            });
        });
    });
});
