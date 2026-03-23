/**
 * this tests the behaviour of util.js
 */
import assert from 'assert';
import AsyncTestUtil, { wait } from 'async-test-util';
import {
    randomToken,
    defaultHashSha256,
    now,
    sortDocumentsByLastWriteTime,
    RxDocumentData,
    ensureInteger,
    objectPathMonad,
    b64DecodeUnicode,
    b64EncodeUnicode,
    batchArray,
    clone as rxdbClone,
    createBlob,
    blobToString,
    blobToBase64String,
    createBlobFromBase64,
    overwritable,
    toWithDeleted,
    stringToArrayBuffer,
    arrayBufferToString,
    clone,
    errorToPlainJson,
    parseRevision,
    getHeightOfRevision,
    createRevision
} from '../../plugins/core/index.mjs';
import config from './config.ts';

import {
    validateDatabaseName,
    deepFreezeWhenDevMode
} from '../../plugins/dev-mode/index.mjs';
import {
    isFastMode,
    isBun,
    EXAMPLE_REVISION_1,
    randomStringWithSpecialChars
} from '../../plugins/test-utils/index.mjs';

import { BIG_BASE64 } from '../helper/big-base64.ts';

describe('util.test.js', () => {
    describe('.defaultHashSha256()', () => {
        it('should work with a string', async () => {
            const hash = await defaultHashSha256('foobar');
            assert.strictEqual(typeof hash, 'string');
            assert.ok(hash.length > 0);
        });
        it('should get the same hash twice', async () => {
            const str = randomToken(10);
            const hash = await defaultHashSha256(str);
            const hash2 = await defaultHashSha256(str);
            assert.strictEqual(hash, hash2);
        });
        it('should work with a very large string', async () => {
            const str = randomToken(5000);
            const hash = await defaultHashSha256(str);
            assert.strictEqual(typeof hash, 'string');
            assert.ok(hash.length > 0);
        });
        it('should work with a Blob input', async () => {
            const text = 'foobar';
            const blob = createBlob(text, 'text/plain');
            const hashFromBlob = await defaultHashSha256(blob);
            assert.strictEqual(typeof hashFromBlob, 'string');
            assert.ok(hashFromBlob.length > 0);

            // Hash of Blob should match hash of equivalent ArrayBuffer
            const ab = await blob.arrayBuffer();
            const hashFromAb = await defaultHashSha256(ab);
            assert.strictEqual(hashFromBlob, hashFromAb);
        });
    });
    describe('.sortObject()', () => {
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
                if (!isFastMode()) {
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
                let t = 0;
                const runs = isFastMode() ? 100 : 2000;
                while (t < runs) {
                    t++;
                    method(obj);
                    obj = Object.assign({}, obj);
                }
            });
        });
    });
    describe('.validateDatabaseName()', () => {
        describe('positive', () => {
            it('should validate a normal string', () => {
                validateDatabaseName('foobar');
            });
            it('should validate a normal string with an uppercase letter', () => {
                validateDatabaseName('fooBar');
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
                    throw new Error('too many decimals on ' + asString);
                }
            });

        });
        it('should always be strictly monotonically increasing', () => {
            let previous = 0;
            for (let i = 0; i < 1000; i++) {
                const value = now();
                assert.ok(
                    value > previous,
                    'now() value ' + value + ' must be greater than previous ' + previous + ' at iteration ' + i
                );
                previous = value;
            }
        });
        it('should always have maximum two decimal places', () => {
            for (let i = 0; i < 1000; i++) {
                const value = now();
                const asString = value.toString();
                const afterDot = asString.split('.')[1];
                if (afterDot && afterDot.length > 2) {
                    throw new Error('too many decimals on ' + asString + ' at iteration ' + i);
                }
            }
        });
        it('should handle the sub-millisecond counter overflow (99 to next ms) correctly', () => {
            /**
             * Call now() many times in a tight loop so that
             * we are guaranteed to exceed 99 calls within a single millisecond,
             * triggering the counter overflow where _lastNowSub reaches 100
             * and _lastNowMs is incremented.
             */
            const values: number[] = [];
            for (let i = 0; i < 500; i++) {
                values.push(now());
            }

            // All values must be unique
            const uniqueValues = new Set(values);
            assert.strictEqual(uniqueValues.size, values.length, 'all values must be unique');

            // All values must be strictly increasing
            for (let i = 1; i < values.length; i++) {
                assert.ok(
                    values[i] > values[i - 1],
                    'value at index ' + i + ' (' + values[i] + ') must be greater than value at index ' + (i - 1) + ' (' + values[i - 1] + ')'
                );
            }

            // All values must have maximum two decimal places
            for (const val of values) {
                const afterDot = val.toString().split('.')[1];
                if (afterDot && afterDot.length > 2) {
                    throw new Error('too many decimals on ' + val.toString());
                }
            }

            /**
             * Check that the overflow happened by verifying
             * that consecutive values can cross a millisecond boundary.
             * Look for a pair where the integer part increases by 1
             * while the previous value had a non-zero decimal.
             */
            let overflowFound = false;
            for (let i = 1; i < values.length; i++) {
                const prevMs = Math.floor(values[i - 1]);
                const currMs = Math.floor(values[i]);
                const prevSub = Math.round((values[i - 1] - prevMs) * 100);
                if (currMs > prevMs && prevSub > 1) {
                    overflowFound = true;
                    break;
                }
            }
            assert.ok(
                overflowFound,
                'should have observed a sub-millisecond counter overflow across 500 rapid calls'
            );
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
    describe('blob util', () => {
        /**
         * Some runtimes like bun, do not support these blob transformings
         * and therefore also do not support attachments.
         * @link https://github.com/oven-sh/bun/issues/5645
         */
        if (!config.storage.hasAttachments) {
            return;
        }
        it('should be able to run all functions', async () => {
            const text = 'foobar';
            const blob = createBlob(text, 'plain/text');
            const asString = await blobToString(blob);
            assert.strictEqual(text, asString);
        });
        it('should be able to run often in circle', async () => {
            const text = 'foobar';
            let blob = createBlob(text, 'plain/text');
            let asString = await blobToString(blob);
            blob = createBlob(asString, 'plain/text');
            asString = await blobToString(blob);
            blob = createBlob(asString, 'plain/text');
            asString = await blobToString(blob);

            assert.strictEqual(text, asString);
        });
        it('.size() should return a deterministic value', () => {
            const amount = 30;
            const str = randomToken(amount);
            const blob = createBlob(str, 'plain/text');
            const size = blob.size;
            assert.strictEqual(size, amount);
        });
        it('should do the correct base64 conversion', async () => {
            const plain = 'aaa';
            const base64 = 'YWFh';

            const blob = createBlob(plain, 'plain/text');
            assert.strictEqual(
                await blobToBase64String(blob),
                base64
            );
            assert.strictEqual(
                await blobToString(blob),
                plain
            );

            const blobFromb64 = await createBlobFromBase64(base64, 'plain/text');
            assert.strictEqual(
                await blobToBase64String(blobFromb64),
                base64
            );
            assert.strictEqual(
                await blobToString(blobFromb64),
                plain
            );
        });
        it('should work with non latin-1 chars', async () => {
            const plain = 'aäß';
            const base64 = 'YcOkw58=';
            const blob = createBlob(plain, 'plain/text');
            assert.strictEqual(
                await blobToString(blob),
                plain
            );
            assert.strictEqual(
                await blobToBase64String(blob),
                base64
            );
            assert.strictEqual(
                await blobToString(blob),
                plain
            );
            const blobFromb64 = await createBlobFromBase64(base64, 'plain/text');
            assert.strictEqual(
                await blobToString(blobFromb64),
                plain
            );
            assert.strictEqual(
                await blobToBase64String(blobFromb64),
                base64
            );
            assert.strictEqual(
                await blobToString(blobFromb64),
                plain
            );
        });
        it('deepClone should preserve Blob instances by reference', () => {
            const text = 'some attachment data';
            const blob = createBlob(text, 'text/plain');
            const obj = {
                _attachments: {
                    'file.txt': {
                        data: blob,
                        type: 'text/plain'
                    }
                }
            };
            const cloned = clone(obj);
            // Blob should be the exact same reference (not cloned into a plain object)
            assert.ok(cloned._attachments['file.txt'].data instanceof Blob);
            assert.strictEqual(cloned._attachments['file.txt'].data, blob);
        });
        it('deepClone should preserve Blob in nested arrays', () => {
            const blob = createBlob('test', 'text/plain');
            const arr = [{ data: blob }, 'other'];
            const cloned = clone(arr);
            assert.ok((cloned[0] as any).data instanceof Blob);
            assert.strictEqual((cloned[0] as any).data, blob);
        });
    });
    describe('.deepFreezeWhenDevMode()', () => {
        if (isBun) {
            /**
             * Bun has no strict mode here.
             * This is likely a Bun bug and might
             * be fixed in future versions.
             */
            return;
        }
        it('should have enabled dev-mode', () => {
            assert.strictEqual(
                overwritable.isDevMode(),
                true
            );
        });
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
        it('cloning a deep-frozen object should make it mutateable', () => {
            const obj = {
                foo: 'bar'
            };
            const frozen = deepFreezeWhenDevMode(obj);
            const cloned = clone(frozen);
            cloned.foo = 'bar2';
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
        ].map((value, i) => {
            it(`should throw error for #${i} argument`, () => {
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
    describe('.toWithDeleted()', () => {
        it('should have the _deleted flag set', () => {
            assert.strictEqual(toWithDeleted({})._deleted, false);
            assert.strictEqual(toWithDeleted({ _deleted: false })._deleted, false);
            assert.strictEqual(toWithDeleted({ _deleted: true })._deleted, true);
        });
        it('should have _attachments and _meta and _rev removed', () => {
            assert.strictEqual(toWithDeleted({ _meta: {} })._meta, undefined);
            assert.strictEqual(toWithDeleted({ _attachments: {} })._attachments, undefined);
            assert.strictEqual(toWithDeleted({ _rev: 'aa' })._rev, undefined);
        });
    });
    describe('.arrayBufferToString() / .stringToArrayBuffer()', () => {
        it('should return the correct result', () => {
            const str = randomStringWithSpecialChars(900, 1000);
            const buffer = stringToArrayBuffer(str);
            const back = arrayBufferToString(buffer);
            assert.strictEqual(str, back);
        });
        /**
         * @link https://github.com/pubkey/rxdb/issues/5624
         */
        it('#5624 should work with really big strings', () => {
            const str = randomStringWithSpecialChars(1000 * 220, 1000 * 250);
            const buffer = stringToArrayBuffer(str);
            const back = arrayBufferToString(buffer);
            assert.strictEqual(str, back);
        });
    });
    describe('.errorToPlainJson()', () => {
        it('should return the correct result for an error containing all possible fields', () => {
            const customError = {
                name: 'CustomError',
                message: 'This is a custom error',
                rxdb: false,
                extensions: { code: 'CUSTOM_ERR_CODE' },
                parameters: { value: 'value' },
                code: 'CUSTOM_ERR_CODE',
                stack: 'CustomError: This is a custom error\n at someFile.js'
            };

            const result = errorToPlainJson(customError);

            assert.strictEqual(result.name, customError.name);
            assert.strictEqual(result.message, customError.message);
            assert.strictEqual(result.rxdb, customError.rxdb);
            assert.deepStrictEqual(result.extensions, customError.extensions);
            assert.deepStrictEqual(result.parameters, customError.parameters);
            assert.strictEqual(result.code, customError.code);
            assert.strictEqual(result.stack, 'CustomError: This is a custom error \n  at someFile.js');
        });
    });
    describe('.randomStringWithSpecialChars()', () => {
        it('should return a string with an emoji at some point', () => {
            let t = 0;
            while (t < 1000) {
                t++;
                const str = randomStringWithSpecialChars(3, 10);
                if (str.includes('👵')) {
                    return;
                }
            }
            throw new Error('no emoji string created');
        });
        /**
         * This test is important because emojis have 2 chars in javascript.
         * For example '🍌'.length is 2
         */
        it('should never create a string the exceeds the length', () => {
            let t = 0;
            const length = 10;
            while (t < 100) {
                t++;
                const str = randomStringWithSpecialChars(length, length);
                if (str.length !== length) {
                    throw new Error('string has wrong length(is: ' + str.length + ', should:' + length + '): "' + str + '"');
                }
            }
        });
    });
    describe('.parseRevision()', () => {
        it('should parse a single-digit height', () => {
            const result = parseRevision('1-abc');
            assert.strictEqual(result.height, 1);
            assert.strictEqual(result.hash, 'abc');
        });
        it('should parse a two-digit height', () => {
            const result = parseRevision('42-foobar');
            assert.strictEqual(result.height, 42);
            assert.strictEqual(result.hash, 'foobar');
        });
        it('should parse a three-digit height', () => {
            const result = parseRevision('123-xyz');
            assert.strictEqual(result.height, 123);
            assert.strictEqual(result.hash, 'xyz');
        });
        it('should parse a four-digit height', () => {
            const result = parseRevision('1234-hash123');
            assert.strictEqual(result.height, 1234);
            assert.strictEqual(result.hash, 'hash123');
        });
        it('should parse a large height', () => {
            const result = parseRevision('999999-longhash');
            assert.strictEqual(result.height, 999999);
            assert.strictEqual(result.hash, 'longhash');
        });
        it('should parse height 0', () => {
            const result = parseRevision('0-zerohash');
            assert.strictEqual(result.height, 0);
            assert.strictEqual(result.hash, 'zerohash');
        });
        it('should throw on malformatted revision without dash', () => {
            assert.throws(() => parseRevision('nope'));
        });
    });
    describe('.getHeightOfRevision()', () => {
        it('should get height from a single-digit revision', () => {
            assert.strictEqual(getHeightOfRevision('1-abc'), 1);
        });
        it('should get height from a two-digit revision', () => {
            assert.strictEqual(getHeightOfRevision('42-foobar'), 42);
        });
        it('should get height from a three-digit revision', () => {
            assert.strictEqual(getHeightOfRevision('123-xyz'), 123);
        });
        it('should get height from a four-digit revision', () => {
            assert.strictEqual(getHeightOfRevision('1234-hash123'), 1234);
        });
        it('should get height from a large revision', () => {
            assert.strictEqual(getHeightOfRevision('999999-longhash'), 999999);
        });
        it('should get height 0', () => {
            assert.strictEqual(getHeightOfRevision('0-zerohash'), 0);
        });
        it('should get all single-digit heights correctly', () => {
            for (let i = 0; i <= 9; i++) {
                assert.strictEqual(getHeightOfRevision(i + '-hash'), i);
            }
        });
    });
    describe('.createRevision()', () => {
        it('should create a revision with height 1 for new documents', () => {
            const rev = createRevision('mytoken');
            assert.strictEqual(rev, '1-mytoken');
            assert.strictEqual(getHeightOfRevision(rev), 1);
        });
        it('should increment the height for existing documents', () => {
            const token = 'mytoken';
            const previousDocData = {
                _rev: '5-oldtoken',
                _attachments: {},
                _deleted: false,
                _meta: { lwt: 0 }
            } as any;
            const rev = createRevision(token, previousDocData);
            assert.strictEqual(rev, '6-mytoken');
            assert.strictEqual(getHeightOfRevision(rev), 6);
        });
        it('should increment correctly from a multi-digit height', () => {
            const token = 'mytoken';
            const previousDocData = {
                _rev: '99-oldtoken',
                _attachments: {},
                _deleted: false,
                _meta: { lwt: 0 }
            } as any;
            const rev = createRevision(token, previousDocData);
            assert.strictEqual(rev, '100-mytoken');
            assert.strictEqual(getHeightOfRevision(rev), 100);
        });
    });
});

