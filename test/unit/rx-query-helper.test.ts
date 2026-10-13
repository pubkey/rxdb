import assert from 'assert';
import {
    createTopKDocumentsCollector,
    fillWithDefaultSettings,
    getSortComparator,
    normalizeMangoQuery,
    randomNumber,
    randomToken,
    shouldUseTopKSelection,
    sortAndSliceDocuments,
    TOP_K_SELECTION_FACTOR,
    type MangoQuerySortPart,
    type RxDocumentData,
    type RxJsonSchema
} from '../../plugins/core/index.mjs';
import {
    isFastMode
} from '../../plugins/test-utils/index.mjs';

type TopKTestDoc = {
    id: string;
    num: number;
    str: string;
    bool: boolean;
    mixed: any;
    optional?: number;
    nested: {
        deep: {
            value: number;
        };
        str: string;
    };
};

const schema: RxJsonSchema<RxDocumentData<TopKTestDoc>> = fillWithDefaultSettings({
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: {
            type: 'string',
            maxLength: 20
        },
        num: {
            type: 'number'
        },
        str: {
            type: 'string',
            maxLength: 20
        },
        bool: {
            type: 'boolean'
        },
        mixed: {},
        optional: {
            type: 'number'
        },
        nested: {
            type: 'object',
            properties: {
                deep: {
                    type: 'object',
                    properties: {
                        value: {
                            type: 'number'
                        }
                    }
                },
                str: {
                    type: 'string'
                }
            }
        }
    },
    required: ['id', 'num', 'str', 'bool', 'nested']
});

const SORTABLE_FIELDS = [
    'num',
    'str',
    'bool',
    'mixed',
    'optional',
    'nested.deep.value',
    'nested.str'
];

/**
 * Sort values are primitives only. Equal objects with different
 * identity make the sort comparator return 0 for that sort part,
 * which is not a deterministic order.
 */
function randomDoc(): RxDocumentData<TopKTestDoc> {
    const mixedValues: any[] = [
        randomNumber(0, 5),
        randomToken(2),
        null,
        true,
        false,
        undefined
    ];
    const doc: RxDocumentData<TopKTestDoc> = {
        id: randomToken(8),
        num: randomNumber(0, 20),
        str: randomToken(1),
        bool: randomNumber(0, 1) === 1,
        mixed: mixedValues[randomNumber(0, mixedValues.length - 1)],
        nested: {
            deep: {
                value: randomNumber(0, 5)
            },
            str: randomToken(1)
        },
        _deleted: false,
        _attachments: {},
        _rev: '1-abc',
        _meta: {
            lwt: 1
        }
    };
    if (randomNumber(0, 1) === 1) {
        doc.optional = randomNumber(0, 10);
    }
    return doc;
}

function randomSort(): MangoQuerySortPart<TopKTestDoc>[] {
    const fieldsAmount = randomNumber(1, 3);
    const fields = SORTABLE_FIELDS
        .slice(0)
        .sort(() => Math.random() - 0.5)
        .slice(0, fieldsAmount);
    return fields.map(field => {
        return {
            [field]: randomNumber(0, 1) === 1 ? 'asc' : 'desc'
        } as any;
    });
}

function randomLimit(docsAmount: number): number | undefined {
    const mode = randomNumber(0, 6);
    switch (mode) {
        case 0: return undefined;
        case 1: return 0;
        case 2: return 1;
        case 3: return docsAmount;
        case 4: return docsAmount + randomNumber(1, 10);
        default: return randomNumber(1, docsAmount);
    }
}

function randomSkip(docsAmount: number): number {
    const mode = randomNumber(0, 4);
    switch (mode) {
        case 0: return 0;
        case 1: return 1;
        case 2: return docsAmount;
        default: return randomNumber(0, docsAmount);
    }
}

function expectedResult(
    docs: RxDocumentData<TopKTestDoc>[],
    comparator: (a: any, b: any) => number,
    skip: number,
    limit: number | undefined
) {
    const sorted = docs.slice(0).sort(comparator);
    return typeof limit === 'number'
        ? sorted.slice(skip, skip + limit)
        : sorted.slice(skip);
}

describe('rx-query-helper.test.ts', () => {
    describe('.shouldUseTopKSelection()', () => {
        it('should not use top-k without a limit', () => {
            assert.strictEqual(shouldUseTopKSelection(1000, Infinity), false);
        });
        it('should not use top-k when k is close to n', () => {
            assert.strictEqual(shouldUseTopKSelection(100, 100), false);
            assert.strictEqual(shouldUseTopKSelection(100, 50), false);
        });
        it('should use top-k when k is small compared to n', () => {
            const k = 10;
            assert.strictEqual(shouldUseTopKSelection(k * TOP_K_SELECTION_FACTOR + 1, k), true);
            assert.strictEqual(shouldUseTopKSelection(100000, 50), true);
        });
    });
    describe('.sortAndSliceDocuments()', () => {
        it('should return the same as a full sort plus slice for fixed cases', () => {
            const docs = new Array(200).fill(0).map(() => randomDoc());
            const query = normalizeMangoQuery(schema, {
                selector: {},
                sort: [{ num: 'desc' }, { str: 'asc' }]
            });
            const comparator = getSortComparator(schema, query);
            const cases: [number, number | undefined][] = [
                [0, undefined],
                [0, 0],
                [0, 1],
                [0, 10],
                [5, 10],
                [100, 10],
                [199, 10],
                [200, 10],
                [250, 10],
                [0, 200],
                [0, 300],
                [50, undefined],
                [0, 99],
                [0, 100],
                [0, 101]
            ];
            cases.forEach(([skip, limit]) => {
                const expected = expectedResult(docs, comparator, skip, limit);
                const actual = sortAndSliceDocuments(docs.slice(0), comparator, skip, limit);
                assert.deepStrictEqual(actual, expected, 'skip=' + skip + ' limit=' + limit);
            });
        });
        it('should handle an empty input', () => {
            const query = normalizeMangoQuery(schema, { selector: {}, sort: [{ num: 'asc' }] });
            const comparator = getSortComparator(schema, query);
            assert.deepStrictEqual(sortAndSliceDocuments([], comparator, 0, 10), []);
            assert.deepStrictEqual(sortAndSliceDocuments([], comparator, 0, undefined), []);
            assert.deepStrictEqual(createTopKDocumentsCollector(comparator, 0, 10).getResult(), []);
        });
        it('should return the same as a full sort plus slice for random docs, sorts, skip and limit', () => {
            const runs = isFastMode() ? 100 : 1000;
            for (let run = 0; run < runs; run++) {
                const docsAmount = randomNumber(0, 300);
                const docs = new Array(docsAmount).fill(0).map(() => randomDoc());
                const sort = randomSort();
                const query = normalizeMangoQuery(schema, {
                    selector: {},
                    sort
                });
                const comparator = getSortComparator(schema, query);
                const skip = randomSkip(docsAmount);
                const limit = randomLimit(docsAmount);
                const expected = expectedResult(docs, comparator, skip, limit);
                const context = JSON.stringify({ sort, skip, limit, docsAmount });

                const actual = sortAndSliceDocuments(docs.slice(0), comparator, skip, limit);
                assert.deepStrictEqual(actual, expected, 'sortAndSliceDocuments ' + context);

                const collector = createTopKDocumentsCollector(comparator, skip, limit);
                docs.forEach(doc => collector.push(doc));
                const streamed = collector.getResult();
                assert.deepStrictEqual(streamed, expected, 'createTopKDocumentsCollector ' + context);
            }
        });
    });
    describe('.createTopKDocumentsCollector()', () => {
        it('should keep only skip+limit documents in memory once enough documents are seen', () => {
            const query = normalizeMangoQuery(schema, { selector: {}, sort: [{ num: 'asc' }] });
            const comparator = getSortComparator(schema, query);
            const docs = new Array(1000).fill(0).map(() => randomDoc());
            const skip = 3;
            const limit = 7;
            const collector = createTopKDocumentsCollector(comparator, skip, limit);
            docs.forEach(doc => collector.push(doc));
            const result = collector.getResult();
            assert.deepStrictEqual(result, expectedResult(docs, comparator, skip, limit));
            assert.strictEqual(result.length, limit);
        });
    });
});
