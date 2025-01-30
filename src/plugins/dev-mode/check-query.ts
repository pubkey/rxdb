import type {
    RxPluginPreCreateRxQueryArgs,
    MangoQuery,
    RxPluginPrePrepareQueryArgs,
    FilledMangoQuery,
    RxJsonSchema,
    RxDocumentData,
    MangoQuerySelector,
    PreparedQuery,
    RxQueryOP,
    RxPluginPrePrepareRxQueryArgs
} from '../../types/index.d.ts';
import { newRxError, newRxTypeError } from '../../rx-error.ts';
import { deepEqual, findUndefinedPath } from '../utils/index.ts';
import { prepareQuery } from '../../rx-query-helper.ts';

/**
 * accidentally passing a non-valid object into the query params
 * is very hard to debug especially when queries are observed
 * This is why we do some checks here in dev-mode
 */
export function checkQuery(args: RxPluginPreCreateRxQueryArgs) {
    const isPlainObject = Object.prototype.toString.call(args.queryObj) === '[object Object]';
    if (!isPlainObject) {
        throw newRxTypeError('QU11', {
            op: args.op,
            collection: args.collection.name,
            queryObj: args.queryObj
        });
    }

    const validKeys: (keyof MangoQuery)[] = [
        'selector',
        'limit',
        'skip',
        'sort',
        'index'
    ];
    Object.keys(args.queryObj).forEach(key => {
        if (!(validKeys as string[]).includes(key)) {
            throw newRxTypeError('QU11', {
                op: args.op,
                collection: args.collection.name,
                queryObj: args.queryObj,
                key,
                args: {
                    validKeys
                }
            });
        }
    });

    // do not allow skip or limit for count queries
    if (
        args.op === 'count' &&
        (
            args.queryObj.limit ||
            args.queryObj.skip
        )
    ) {
        throw newRxError(
            'QU15',
            {
                collection: args.collection.name,
                query: args.queryObj
            }
        );
    }

    ensureObjectDoesNotContainRegExp(args.queryObj);
}


export function checkMangoQuery(args: RxPluginPrePrepareQueryArgs) {
    const schema = args.rxQuery.collection.schema.jsonSchema;

    const undefinedFieldPath = findUndefinedPath(args.mangoQuery);
    if (undefinedFieldPath) {
        throw newRxError('QU19', {
            field: undefinedFieldPath,
            query: args.mangoQuery,
        });
    }

    /**
     * Ensure that all top level fields are included in the schema.
     * TODO this check can be augmented to also check sub-fields.
     */
    const massagedSelector: MangoQuerySelector<any> = args.mangoQuery.selector;
    const schemaTopLevelFields = Object.keys(schema.properties);
    Object.keys(massagedSelector)
        // do not check operators
        .filter(fieldOrOperator => !fieldOrOperator.startsWith('$'))
        // skip this check on non-top-level fields
        .filter(field => !field.includes('.'))
        .forEach(field => {
            if (!schemaTopLevelFields.includes(field)) {
                throw newRxError('QU13', {
                    schema,
                    field,
                    query: args.mangoQuery,
                });
            }
        });

    /**
     * ensure if custom index is set,
     * it is also defined in the schema
     */
    const schemaIndexes = schema.indexes ? schema.indexes : [];
    const index = args.mangoQuery.index;
    if (index) {
        const isInSchema = schemaIndexes.find(schemaIndex => deepEqual(schemaIndex, index));
        if (!isInSchema) {
            throw newRxError(
                'QU12',
                {
                    collection: args.rxQuery.collection.name,
                    query: args.mangoQuery,
                    schema
                }
            );
        }
    }


    /**
     * Ensure that a count() query can only be used
     * with selectors that are fully satisfied by the used index.
     */
    if (args.rxQuery.op === 'count') {
        if (
            !areSelectorsSatisfiedByIndex(
                args.rxQuery.collection.schema.jsonSchema,
                args.mangoQuery
            ) &&
            !args.rxQuery.collection.database.allowSlowCount
        ) {
            throw newRxError('QU14', {
                collection: args.rxQuery.collection,
                query: args.mangoQuery
            });
        }
    }

    /**
     * Ensure that sort only runs on known fields
     * TODO also check nested fields
     */
    if (args.mangoQuery.sort) {
        args.mangoQuery.sort
            .map(sortPart => Object.keys(sortPart)[0])
            .filter(field => !field.includes('.'))
            .forEach(field => {
                if (!schemaTopLevelFields.includes(field)) {
                    throw newRxError('QU13', {
                        schema,
                        field,
                        query: args.mangoQuery,
                    });
                }
            });
    }

    // Do not allow RexExp instances
    ensureObjectDoesNotContainRegExp(args.mangoQuery);
}


export function areSelectorsSatisfiedByIndex<RxDocType>(
    schema: RxJsonSchema<RxDocumentData<RxDocType>>,
    query: FilledMangoQuery<RxDocType>
): boolean {
    const preparedQuery: PreparedQuery<any> = prepareQuery(
        schema,
        query
    );
    return preparedQuery.queryPlan.selectorSatisfiedByIndex;
}

/**
 * Ensures that the selector does not contain any RegExp instance.
 * @recursive
 */
export function ensureObjectDoesNotContainRegExp(selector: any) {
    if (typeof selector !== 'object' || selector === null) {
        return;
    }
    const keys = Object.keys(selector);
    keys.forEach(key => {
        const value: any = selector[key];
        if (value instanceof RegExp) {
            throw newRxError('QU16', {
                field: key,
                query: selector,
            });
        } else if (Array.isArray(value)) {
            value.forEach(item => ensureObjectDoesNotContainRegExp(item));
        } else {
            ensureObjectDoesNotContainRegExp(value);
        }
    });
}


/**
 * People often use queries wrong
 * so we have some checks here.
 * For example people use numbers as primary keys
 * which is not allowed.
 */
export function isQueryAllowed(args: RxPluginPrePrepareRxQueryArgs) {
    if (args.op === 'findOne') {
        if (
            typeof args.queryObj === 'number' ||
            Array.isArray(args.queryObj)
        ) {
            throw newRxTypeError('COL6', {
                collection: args.collection.name,
                queryObj: args.queryObj
            });
        }
    } else if (args.op === 'find') {
        if (typeof args.queryObj === 'string') {
            throw newRxError('COL5', {
                collection: args.collection.name,
                queryObj: args.queryObj
            });
        }
    }
}
