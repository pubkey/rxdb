/**
 * this tests the behaviour of util.js
 */
import assert from 'assert';
import AsyncTestUtil, { randomString, wait } from 'async-test-util';
import {
    randomCouchString,
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
    getBlobSize,
    blobToBase64String,
    createBlobFromBase64,
    overwritable,
    toWithDeleted,
    stringToArrayBuffer,
    arrayBufferToString,
    clone
} from '../../plugins/core/index.mjs';
import config from './config.ts';

import {
    validateDatabaseName,
    deepFreezeWhenDevMode
} from '../../plugins/dev-mode/index.mjs';
import {
    nativeSha256,
    jsSha256,
    canUseCryptoSubtle
} from '../../plugins/utils/index.mjs';
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
            const str = randomCouchString(10);
            const hash = await defaultHashSha256(str);
            const hash2 = await defaultHashSha256(str);
            assert.strictEqual(hash, hash2);
        });
        it('should work with a very large string', async () => {
            const str = randomCouchString(5000);
            const hash = await defaultHashSha256(str);
            assert.strictEqual(typeof hash, 'string');
            assert.ok(hash.length > 0);
        });
        it('must have enabled canUseCryptoSubtle', () => {
            assert.ok(canUseCryptoSubtle);
        });
        it('both versions must return the exact same value', async () => {
            const values: string[] = [
                'foobar',
                randomString(100),
                'asdf#äge#äö34g?!§"=$%'
            ];

            for (const value of values) {
                const hashNative = await nativeSha256(value);
                const hashJavaScript = await jsSha256(value);
                if (hashJavaScript !== hashNative) {
                    throw new Error('hashes not equal for value: ' + value);
                }
            }
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
                const start = performance.now();
                let t = 0;
                const runs = isFastMode() ? 100 : 2000;
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
                    throw new Error('too many decimals on ' + asString);
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
            const str = randomCouchString(amount);
            const blob = createBlob(str, 'plain/text');
            const size = getBlobSize(blob);
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
    });
    describe('.deepFreezeWhenDevMode()', () => {
        if (isBun) {
            // TODO for somehow bun has no strict mode here
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
            const str = randomStringWithSpecialChars(1000);
            const buffer = stringToArrayBuffer(str);
            const back = arrayBufferToString(buffer);
            assert.strictEqual(str, back);
        });
        /**
         * @link https://github.com/pubkey/rxdb/issues/5624
         */
        it('#5624 should work with really big strings', () => {
            const str = randomStringWithSpecialChars(1000 * 250);
            const buffer = stringToArrayBuffer(str);
            const back = arrayBufferToString(buffer);
            assert.strictEqual(str, back);
        });
    });
});

