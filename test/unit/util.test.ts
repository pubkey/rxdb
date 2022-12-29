/**
 * this tests the behaviour of util.js
 */
import assert from 'assert';
import AsyncTestUtil, { wait } from 'async-test-util';
import {
    fastUnsecureHash,
    randomCouchString,
    sortObject,
    now,
    blobBufferUtil,
    sortDocumentsByLastWriteTime,
    RxDocumentData,
    ensureInteger,
    objectPathMonad,
    b64DecodeUnicode,
    b64EncodeUnicode,
    batchArray,
    clone as rxdbClone
} from '../../';
import config from './config';

import {
    validateDatabaseName,
    deepFreezeWhenDevMode
} from '../../plugins/dev-mode';
import { EXAMPLE_REVISION_1 } from '../helper/revisions';

import { BIG_BASE64 } from '../helper/big-base64';

describe('util.test.js', () => {
    describe('.fastUnsecureHash()', () => {
        function ensureSameHashWithoutTextEncoder(str: string) {
            const hashWith = fastUnsecureHash(str);
            const hashWithout = fastUnsecureHash(str, true);
            assert.strictEqual(hashWith, hashWithout);
        }
        it('should work with a string', () => {
            const hash = fastUnsecureHash('foobar');
            assert.strictEqual(typeof hash, 'string');
            assert.ok(hash.length > 0);
            ensureSameHashWithoutTextEncoder('foobar');
        });
        it('should get the same hash twice', () => {
            const str = randomCouchString(10);
            const hash = fastUnsecureHash(str);
            const hash2 = fastUnsecureHash(str);
            assert.strictEqual(hash, hash2);
            ensureSameHashWithoutTextEncoder(str);
        });
        it('should work with a very large string', () => {
            const str = randomCouchString(5000);
            const hash = fastUnsecureHash(str);
            assert.strictEqual(typeof hash, 'string');
            assert.ok(hash.length > 0);
            ensureSameHashWithoutTextEncoder(str);
        });


        // // TESTS for the performance of different javascript hash functions.
        // const MurmurHash3 = require('imurmurhash');
        // const mmh3 = require('murmurhash3'); // Node native C++ binding
        // const murmurhash = require('murmurhash');
        // const fnv1a = require('fnv1a');
        // const hashSum = require('hash-sum');
        // const ohash = require('ohash');

        // /**
        //  * @link https://stackoverflow.com/questions/6122571/simple-non-secure-hash-function-for-javascript#comment67396297_6122571
        //  */
        // function hashJoaat(b) {
        //     for (var a = 0, c = b.length; c--;)a += b.charCodeAt(c), a += a << 10, a ^= a >> 6; a += a << 3; a ^= a >> 11; return ((a + (a << 15) & 4294967295) >>> 0).toString(16)
        // }

        // [
        //     (str: string) => murmurhash.v3(str).toString(36),
        //     (str: string) => fastUnsecureHash(str),
        //     (str: string) => hashSum(str),
        //     (str: string) => fnv1a(str).toString(36),
        //     (str: string) => mmh3.murmur32HexSync(str).toString(36),
        //     (str: string) => murmurhash.v2(str).toString(36),
        //     (str: string) => ohash.murmurHash(str),
        //     (str: string) => hashJoaat(str),
        //     (str: string) => {
        //         const hashState = new MurmurHash3('string');
        //         hashState.hash(str);
        //         return hashState.result();
        //     },
        //     (str: string) => Md5.hash(str)
        // ].forEach(method => {
        //     it('run once', async () => {
        //         await wait(1000);
        //         let str = randomCouchString(20000);
        //         const start = performance.now();
        //         let t = 0;
        //         while (t < 6000) {
        //             t++;
        //             method(str);
        //             str += '-';
        //         }

        //         console.log('sample: ' + method(str));

        //         const time = performance.now() - start;
        //         console.log('time ' + time);
        //     });
        // });
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
    describe('.recursiveDeepCopy()', () => {
        /**
         * Test the performance of different methods.
         */
        const cloneMethods: ((o: any) => any)[] = [
            o => rxdbClone(o),
            o => structuredClone(o),
            o => JSON.parse(JSON.stringify(o))
        ];
        cloneMethods.forEach(method => {
            it('run once', async () => {
                if(!config.isFastMode()){
                    await wait(200);
                }
                let obj = {
                    a: 'a',
                    b: 7879,
                    g: false,
                    h: [
                        { g: 0, l: true, k: { l: 56 } },
                        { g: 0, l: true, fg: 'dfg', k: { l: 56 } },
                        { g: 0, l: true, k: { l: 56 } }
                    ],
                    jk: {
                        ager: 56,
                        tank: 'sj',
                        what: {
                            sdf: {
                                sdf: 'asdasd',
                                ll: ['safd', { sdfs: 'dfsf' }]
                            }
                        }
                    }
                };
                const start = performance.now();
                let t = 0;
                const runs = config.isFastMode() ? 100 : 2000;
                while (t < runs) {
                    t++;
                    method(obj);
                    obj = Object.assign({}, obj);
                }
                const time = performance.now() - start;
                console.log('time ' + time);
            });
        });
    });
    describe('.validateDatabaseName()', () => {
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
            const values: Set<number> = new Set();
            const runs = 500;

            new Array(runs)
                .fill(0)
                .forEach(() => {
                    values.add(now());
                });

            // ensure we had no duplicates
            assert.strictEqual(values.size, runs);

            // ensure that all values have maximum two decimals
            Array.from(values.values()).forEach(val => {
                const asString = val.toString();
                const afterDot = asString.split('.')[1];
                if (
                    afterDot &&
                    afterDot.length > 2
                ) {
                    throw new Error('too many decmials on ' + asString);
                }
            });

        });
    });
    describe('base64 helpers', () => {
        it('should correctly encode/decode in a circle', () => {
            const str = 'foobar';
            const circled = b64DecodeUnicode(b64EncodeUnicode(str));
            assert.strictEqual(str, circled);
        });
        it('should be able to decode this big base64', () => {
            const decoded = b64DecodeUnicode(BIG_BASE64);
            assert.ok(decoded);
        });
    });
    describe('blobBufferUtil', () => {
        it('should be able to run all functions', async () => {
            const text = 'foobar';
            const blobBuffer = blobBufferUtil.createBlobBuffer(text, 'plain/text');
            assert.ok(blobBufferUtil.isBlobBuffer(blobBuffer));
            const asString = await blobBufferUtil.toString(blobBuffer);
            assert.strictEqual(text, asString);
        });
        it('should be able to run often in circle', async () => {
            const text = 'foobar';
            let blobBuffer = blobBufferUtil.createBlobBuffer(text, 'plain/text');
            let asString = await blobBufferUtil.toString(blobBuffer);
            blobBuffer = blobBufferUtil.createBlobBuffer(asString, 'plain/text');
            asString = await blobBufferUtil.toString(blobBuffer);
            blobBuffer = blobBufferUtil.createBlobBuffer(asString, 'plain/text');
            asString = await blobBufferUtil.toString(blobBuffer);

            assert.strictEqual(text, asString);
        });
        it('.size() should return a deterministic value', () => {
            const amount = 30;
            const str = randomCouchString(amount);
            const blobBuffer = blobBufferUtil.createBlobBuffer(str, 'plain/text');
            const size = blobBufferUtil.size(blobBuffer);
            assert.strictEqual(size, amount);
        });
        it('should do the correct base64 conversion', async () => {
            const plain = 'aaa';
            const base64 = 'YWFh';

            const blobBuffer = blobBufferUtil.createBlobBuffer(plain, 'plain/text');
            assert.strictEqual(
                await blobBufferUtil.toBase64String(blobBuffer),
                base64
            );
            assert.strictEqual(
                await blobBufferUtil.toString(blobBuffer),
                plain
            );

            const blobBufferFromb64 = await blobBufferUtil.createBlobBufferFromBase64(base64, 'plain/text');
            assert.strictEqual(
                await blobBufferUtil.toBase64String(blobBufferFromb64),
                base64
            );
            assert.strictEqual(
                await blobBufferUtil.toString(blobBufferFromb64),
                plain
            );
        });
        it('should work with non latin-1 chars', async () => {
            const plain = 'aäß';
            const base64 = 'YcOkw58=';
            const blobBuffer = blobBufferUtil.createBlobBuffer(plain, 'plain/text');
            assert.strictEqual(
                await blobBufferUtil.toString(blobBuffer),
                plain
            );
            assert.strictEqual(
                await blobBufferUtil.toBase64String(blobBuffer),
                base64
            );
            assert.strictEqual(
                await blobBufferUtil.toString(blobBuffer),
                plain
            );
            const blobBufferFromb64 = await blobBufferUtil.createBlobBufferFromBase64(base64, 'plain/text');
            assert.strictEqual(
                await blobBufferUtil.toString(blobBufferFromb64),
                plain
            );
            assert.strictEqual(
                await blobBufferUtil.toBase64String(blobBufferFromb64),
                base64
            );
            assert.strictEqual(
                await blobBufferUtil.toString(blobBufferFromb64),
                plain
            );
        });
        // it('should not loose information on transformations', () => {
        //     const baseInput = 'U2FsdGVkX1+Ir6zTZzI4qonSi65Ur30bpTGGs0AZI47raNL2mi2KN2VyabAwzJ5s';
        //     const blobBuffer = blobBufferUtil.createBlobBufferFromBase64(baseInput, 'plain/text');

        // });
    });
    describe('.deepFreezeWhenDevMode()', () => {
        it('should not allow to mutate the object', () => {
            const obj = {
                foo: 'bar'
            };
            const frozen = deepFreezeWhenDevMode(obj);
            assert.throws(
                () => (frozen as any).foo = 'xxx'
            );
        });
        it('should freeze the given object and not create a new frozen one', () => {
            const obj = {
                foo: 'bar'
            };
            const frozen = deepFreezeWhenDevMode(obj);
            assert.ok(obj === frozen);
        });
    });
    describe('.sortDocumentsByLastWriteTime()', () => {
        type SortDocType = { id: string; };
        const sortDocPrimary = 'id';
        it('should sort correctly by lwt', () => {
            const docs: RxDocumentData<SortDocType>[] = [
                {
                    id: 'a',
                    _meta: {
                        lwt: 1000
                    },
                    _deleted: false,
                    _attachments: {},
                    _rev: EXAMPLE_REVISION_1
                },
                {
                    id: 'a',
                    _meta: {
                        lwt: 999
                    },
                    _deleted: false,
                    _attachments: {},
                    _rev: EXAMPLE_REVISION_1
                },
                {
                    id: 'a',
                    _meta: {
                        lwt: 1001
                    },
                    _deleted: false,
                    _attachments: {},
                    _rev: EXAMPLE_REVISION_1
                }
            ];
            const sorted = sortDocumentsByLastWriteTime(sortDocPrimary, docs);
            assert.strictEqual(sorted[0]._meta.lwt, 999);
            assert.strictEqual(sorted[1]._meta.lwt, 1000);
        });
        it('should sort correctly by id', () => {
            const docs: RxDocumentData<SortDocType>[] = [
                {
                    id: 'b',
                    _meta: {
                        lwt: 1000
                    },
                    _deleted: false,
                    _attachments: {},
                    _rev: EXAMPLE_REVISION_1
                },
                {
                    id: 'a',
                    _meta: {
                        lwt: 999
                    },
                    _deleted: false,
                    _attachments: {},
                    _rev: EXAMPLE_REVISION_1
                },
                {
                    id: 'c',
                    _meta: {
                        lwt: 1001
                    },
                    _deleted: false,
                    _attachments: {},
                    _rev: EXAMPLE_REVISION_1
                }
            ];
            const sorted = sortDocumentsByLastWriteTime(sortDocPrimary, docs);
            assert.strictEqual(sorted[0].id, 'a');
            assert.strictEqual(sorted[1].id, 'b');
        });
    });
    describe('.ensureInteger()', () => {
        it('should return the given argument in case of integer', () => {
            assert.doesNotThrow(() => ensureInteger(56));
            assert.strictEqual(ensureInteger(56), 56);
        });
        [
            undefined,
            true,
            [],
            {},
            1.2,
            Infinity,
            ''
        ].map(value => {
            it(`should throw error for ${value} argument`, () => {
                assert.throws(() => ensureInteger(value));
            });
        });
    });
    describe('.batchArray()', () => {
        it('should split into the correct amounts of batches', () => {
            const getArrayWithItems = (amount: number) => {
                return new Array(amount).fill(0);
            };

            assert.strictEqual(
                batchArray(getArrayWithItems(10), 10).length,
                1
            );
            assert.strictEqual(
                batchArray(getArrayWithItems(10), 5).length,
                2
            );
            assert.strictEqual(
                batchArray(getArrayWithItems(10), 3).length,
                4
            );
            assert.strictEqual(
                batchArray(getArrayWithItems(10), 9).length,
                2
            );
        });
    });
    describe('.objectPathMonad()', () => {
        it('should get the correct values', () => {
            const docData = {
                top: 'top',
                nes: {
                    ted: 'nested'
                }
            };
            assert.strictEqual(
                objectPathMonad('top')(docData),
                'top'
            );

            assert.strictEqual(
                objectPathMonad('nes.ted')(docData),
                'nested'
            );
            assert.strictEqual(
                objectPathMonad('notHereTop')(docData),
                undefined
            );
            assert.strictEqual(
                objectPathMonad('not.here.nes.ted')(docData),
                undefined
            );
        });
    });
});
