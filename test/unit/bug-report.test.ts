import assert from 'assert';
import {
    fillWithDefaultSettings,
    normalizeMangoQuery
} from '../../plugins/core/index.mjs';

import type {
    RxJsonSchema
} from '../../plugins/core/index.mjs';

type ElemMatchDoc = {
    id: string;
    type: string;
    roles: string[];
};

describe('bug-report.test.js', () => {
    it('should not normalize operator payloads inside $elemMatch', () => {
        const schema: RxJsonSchema<ElemMatchDoc> = fillWithDefaultSettings({
            version: 0,
            primaryKey: 'id',
            type: 'object',
            properties: {
                id: {
                    type: 'string',
                    maxLength: 100
                },
                type: {
                    type: 'string',
                    maxLength: 100
                },
                roles: {
                    type: 'array',
                    items: {
                        type: 'string'
                    }
                }
            },
            required: ['id', 'type', 'roles'],
            indexes: ['type']
        });

        const regexQuery = normalizeMangoQuery<ElemMatchDoc>(
            schema,
            {
                selector: {
                    type: { $eq: 'PERSON' },
                    roles: {
                        $elemMatch: {
                            $regex: '^applicant$',
                            $options: 'i'
                        }
                    }
                }
            }
        );

        assert.deepStrictEqual(
            (regexQuery.selector as any).roles.$elemMatch,
            {
                $regex: '^applicant$',
                $options: 'i'
            }
        );

        const eqQuery = normalizeMangoQuery<ElemMatchDoc>(
            schema,
            {
                selector: {
                    type: { $eq: 'PERSON' },
                    roles: {
                        $elemMatch: {
                            $eq: 'Applicant'
                        }
                    }
                }
            }
        );

        assert.deepStrictEqual(
            (eqQuery.selector as any).roles.$elemMatch,
            {
                $eq: 'Applicant'
            }
        );
    });
});
