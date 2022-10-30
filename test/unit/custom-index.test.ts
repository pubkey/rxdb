import assert from 'assert';
import {
    clone,
    randomBoolean,
    randomNumber,
    randomString
} from 'async-test-util';
import {
    getIndexableStringMonad,
    RxDocumentData,
    RxJsonSchema,
    getStringLengthOfIndexNumber,
    getStartIndexStringFromLowerBound,
    getStartIndexStringFromUpperBound,
    fillWithDefaultSettings,
    now
} from '../../';
import { EXAMPLE_REVISION_1 } from '../helper/revisions';
import config from './config';

config.parallel('custom-index.test.ts', () => {

    type IndexTestDocType = {
        id: string;
        num: number;
        bool: boolean;
    };
    const schema: RxJsonSchema<RxDocumentData<IndexTestDocType>> = fillWithDefaultSettings({
        primaryKey: 'id',
        version: 0,
        type: 'object',
        properties: {
            id: {
                type: 'string',
                maxLength: 100
            },
            num: {
                type: 'number',
                minimum: 10,
                maximum: 100,
                multipleOf: 0.01
            },
            bool: {
                type: 'boolean'
            }
        },
        required: [
            'id',
            'num',
            'bool'
        ],
        indexes: [
            ['id'],
            ['num'],
            ['bool'],
            [
                'bool',
                'num'
            ]
        ]
    });

    function getIndexTestDoc(partial?: Partial<IndexTestDocType>): RxDocumentData<IndexTestDocType> {
        return Object.assign({
            id: randomString(10),
            num: randomNumber(10, 100),
            bool: randomBoolean(),
            _deleted: false,
            _attachments: {},
            _meta: {
                lwt: new Date().getTime()
            },
            _rev: EXAMPLE_REVISION_1
        }, partial);
    }

    describe('.getStringLengthOfIndexNumber()', () => {
        it('should calculate the correct length', () => {
            const parsed = getStringLengthOfIndexNumber({
                type: 'number',
                minimum: 0.1,
                maximum: 110.5,
                multipleOf: 0.01
            });
            assert.strictEqual(parsed.decimals, 2);
            assert.strictEqual(parsed.nonDecimals, 3);
        });
    });
    describe('.getIndexableStringMonad()', () => {
        describe('index-type: string', () => {
            it('should get a correct string', () => {
                const index = ['id'];
                const docs = [
                    getIndexTestDoc({ id: 'bb' }),
                    getIndexTestDoc({ id: 'aa' })
                ];
                const sorted = docs.sort((a, b) => {
                    const strA = getIndexableStringMonad(
                        schema,
                        index
                    )(a);
                    const strB = getIndexableStringMonad(
                        schema,
                        index
                    )(b);
                    assert.strictEqual(strA.length, schema.properties.id.maxLength);
                    assert.strictEqual(strB.length, schema.properties.id.maxLength);
                    return strA < strB ? -1 : 1;
                });
                assert.strictEqual(sorted[0].id, 'aa');
            });
        });
        describe('index-type: boolean', () => {
            it('should get a correct string', () => {
                const index = ['bool'];
                const docs = [
                    getIndexTestDoc({ bool: true }),
                    getIndexTestDoc({ bool: false })
                ];
                const sorted = docs.sort((a, b) => {
                    const strA = getIndexableStringMonad(
                        schema,
                        index
                    )(a);
                    const strB = getIndexableStringMonad(
                        schema,
                        index
                    )(b);
                    assert.strictEqual(strA.length, 1);
                    assert.strictEqual(strB.length, 1);
                    return strA < strB ? -1 : 1;
                });
                assert.strictEqual(sorted[0].bool, false);
            });
        });
        describe('index-type: number', () => {
            it('should get a valid string', () => {
                const index = ['num'];
                const docData = getIndexTestDoc({ num: 24.02 });
                const indexString = getIndexableStringMonad(
                    schema,
                    index
                )(docData);
                const parsed = getStringLengthOfIndexNumber(schema.properties.num);
                assert.strictEqual(indexString.length, parsed.decimals + parsed.nonDecimals);
            });
            it('should get the correct sort order', () => {
                const index = ['num'];
                const docs = [
                    getIndexTestDoc({ num: 11 }),
                    getIndexTestDoc({ num: 10.02 })
                ];
                const sorted = docs.sort((a, b) => {
                    const strA = getIndexableStringMonad(
                        schema,
                        index
                    )(a);
                    const strB = getIndexableStringMonad(
                        schema,
                        index
                    )(b);
                    assert.strictEqual(strA.length, strB.length);
                    return strA < strB ? -1 : 1;
                });
                assert.strictEqual(sorted[0].num, 10.02);
            });
            it('should work correctly on big numbers', () => {
                type DocType = {
                    id: string;
                    bigNum: number;
                };
                const schema: RxJsonSchema<RxDocumentData<DocType>> = fillWithDefaultSettings({
                    primaryKey: 'id',
                    version: 0,
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            maxLength: 10
                        },
                        bigNum: {
                            type: 'number',
                            minimum: 0,
                            maximum: 1000000000000000,
                            multipleOf: 0.01
                        }
                    },
                    additionalProperties: false,
                    required: [
                        'bigNum'
                    ]
                });
                const index = [
                    'bigNum',
                    'id'
                ];
                const doc: RxDocumentData<DocType> = {
                    id: 'foobar',
                    bigNum: 1661946016806.01,
                    _attachments: {},
                    _deleted: false,
                    _rev: EXAMPLE_REVISION_1,
                    _meta: {
                        lwt: now()
                    }
                };
                const indexString = getIndexableStringMonad(
                    schema,
                    index
                )(doc);
                const mustBeStart = '000166194601680601';
                if (!indexString.startsWith(mustBeStart)) {
                    throw new Error(
                        'indexString does not startWith ' + mustBeStart +
                        '  indexString: ' + indexString
                    );
                }
            });
        });
        describe('special cases', () => {
            it('indexing a optional field must work', () => {
                const schema: RxJsonSchema<RxDocumentData<{ id: string; optional?: string; }>> = fillWithDefaultSettings({
                    primaryKey: 'id',
                    version: 0,
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            maxLength: 100
                        },
                        optional: {
                            type: 'string',
                            maxLength: 100
                        }
                    },
                    required: [
                        'id'
                    ],
                    indexes: [
                        ['id'],
                        ['optional']
                    ]
                });
                const doc = {
                    id: 'foo'
                };
                const strA: string = getIndexableStringMonad<{ id: string; optional?: string; }>(
                    schema,
                    ['optional']
                )(doc as any);
                assert.ok(strA);
                strA.split('').forEach(char => assert.strictEqual(char, ' '));
            });
        });
    });
    describe('.getStartIndexStringFromLowerBound()', () => {
        it('should find the correct docs when comparing with the index', () => {
            const docs = new Array(100).fill(0).map(() => getIndexTestDoc());
            const index = ['bool', 'num'];

            const lowerBoundString = getStartIndexStringFromLowerBound(
                schema,
                index,
                [
                    true,
                    30
                ],
                false
            );

            const matchingDocs = docs.filter(doc => {
                const isIndexStr = getIndexableStringMonad(
                    schema,
                    index
                )(doc);
                return isIndexStr >= lowerBoundString;
            });

            matchingDocs.forEach(doc => {
                assert.ok(doc.bool);
                assert.ok(doc.num >= 30);
            });
        });
    });
    describe('.getStartIndexStringFromUpperBound()', () => {
        it('should match the correct docs', () => {
            const docs = new Array(100).fill(0).map(() => getIndexTestDoc());
            const index = ['bool', 'num'];

            const upperBoundString = getStartIndexStringFromUpperBound(
                schema,
                index,
                [
                    false,
                    30
                ],
                false
            );
            const matchingDocs = docs.filter(doc => {
                const isIndexStr = getIndexableStringMonad(
                    schema,
                    index
                )(doc);
                return isIndexStr <= upperBoundString;
            });

            matchingDocs.forEach(doc => {
                assert.strictEqual(doc.bool, false);
                assert.ok(doc.num <= 30);
            });
        });
        it('should match the correct docs if bound is undefined', () => {
            const docs = new Array(100).fill(0).map(() => getIndexTestDoc());
            const index = ['id'];

            const upperBoundString = getStartIndexStringFromUpperBound(
                schema,
                index,
                [
                    undefined
                ],
                true
            );
            const matchingDocs = docs.filter(doc => {
                const isIndexStr = getIndexableStringMonad(
                    schema,
                    index
                )(doc);
                return isIndexStr <= upperBoundString;
            });

            /**
             * Because the bound was 'undefined',
             * all docs must match.
             */
            assert.strictEqual(
                docs.length,
                matchingDocs.length
            );

            // process.exit();
        });
        /**
         * This index is used by some RxStorage implementations
         * when running a cleanup().
         */
        it('should find the correct string for the _deleted+_meta.lwt index', () => {
            const useSchema = clone(schema);
            const index = ['_deleted', '_meta.lwt'];
            useSchema.indexes.push(index);

            const lowerBoundString = getStartIndexStringFromLowerBound(
                useSchema,
                index,
                [
                    true,
                    1
                ],
                false
            );

            const doc = getIndexTestDoc();
            doc._deleted = true;
            doc._meta.lwt = now();
            const docIndexString = getIndexableStringMonad(
                useSchema,
                index
            )(doc);
            assert.ok(lowerBoundString < docIndexString);
            const upperBoundString = getStartIndexStringFromUpperBound(
                useSchema,
                index,
                [
                    true,
                    now() + 1000 * 10
                ],
                false
            );
            assert.ok(upperBoundString.startsWith('1'));
            assert.ok(docIndexString < upperBoundString);
            const upperBoundString2 = getStartIndexStringFromUpperBound(
                useSchema,
                index,
                [
                    true,
                    now() + 1000 * 100
                ],
                false
            );
            assert.ok(upperBoundString2 > upperBoundString);
        });
    });
});
