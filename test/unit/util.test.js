/**
 * this tests the behaviour of util.js
 */
import assert from 'assert';
import * as util from '../../dist/lib/util';
import AsyncTestUtil from 'async-test-util';

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
    describe('.sortObject()', () => {
        it('should sort when regex in object', async() => {
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
});
