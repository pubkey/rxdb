import { RxPlugin } from '../../types/rx-plugin';
import {
    createQueryBuilder,
    NoSqlQueryBuilder,
    OTHER_MANGO_ATTRIBUTES,
    OTHER_MANGO_OPERATORS
} from './mquery/nosql-query-builder';
import { RxQuery } from '../../types';
import { RxQueryBase, tunnelQueryCache } from '../../rx-query';
import { clone } from '../../util';
import { newRxError } from '../../rx-error';

// if the query-builder plugin is used, we have to save it's last path
const RXQUERY_OTHER_FLAG = 'queryBuilderPath';

/**
 * throws an error that says that the key is not in the schema
 */
function _throwNotInSchema(key: string) {
    throw newRxError('QU5', {
        key
    });
}

/**
 * adds the field of 'sort' to the search-index
 * @link https://github.com/nolanlawson/pouchdb-find/issues/204
 */
function _sortAddToIndex(rxQuery: RxQuery, path: string, builder: NoSqlQueryBuilder) {
    const schemaObj = rxQuery.collection.schema.getSchemaByObjectPath(path);
    if (!schemaObj) _throwNotInSchema(path);

    switch (schemaObj.type) {
        case 'number':
        case 'integer':
            // TODO change back to -Infinity when issue resolved
            // @link https://github.com/pouchdb/pouchdb/issues/6454
            // -Infinity does not work since pouchdb 6.2.0
            builder.where(path).gt(-9999999999999999999999999999);
            break;
        case 'string':
            /**
             * strings need an empty string, see
             * @link https://github.com/pubkey/rxdb/issues/585
             */
            builder.where(path).gt('');
            break;
        default:
            builder.where(path).gt(null);
            break;
    }
}

export function runBuildingStep<RxDocumentType, RxQueryResult>(
    rxQuery: RxQuery<RxDocumentType, RxQueryResult>,
    functionName: string,
    value: any
): RxQuery<RxDocumentType, RxQueryResult> {
    const queryBuilder = createQueryBuilder(clone(rxQuery.mangoQuery));
    if (rxQuery.other[RXQUERY_OTHER_FLAG]) {
        queryBuilder._path = rxQuery.other[RXQUERY_OTHER_FLAG];
    }

    /**
     * we have some pouchdb edge-cases to fix here
     * TODO this must move into rx-storage-pouchdb.d.ts
     */
    switch (functionName) {
        case 'regex':
            // regex does not work over the primary key
            if (rxQuery.other[RXQUERY_OTHER_FLAG] === rxQuery.collection.schema.primaryPath) {
                throw newRxError('QU4', {
                    path: rxQuery.other[RXQUERY_OTHER_FLAG]
                });
            }
            (queryBuilder as any)[functionName](value); // run
            break;
        case 'sort':
            // workarround because sort wont work on unused keys
            // so we add the key to the selector if necessary
            const mq = rxQuery.mangoQuery as any;
            if (typeof value !== 'object') {
                // value looks like '-age'
                const path = value.charAt(0) === '-' ? value.substring(1) : value;
                if (!mq.selector[path]) {
                    _sortAddToIndex(rxQuery, path, queryBuilder);
                }
            } else {
                // value is like '{ age: 'desc' }'
                const key = Object.keys(value)[0];
                if (!mq.selector[key] || !mq.selector[key].$gt) {
                    _sortAddToIndex(rxQuery, key, queryBuilder);
                }
            }
            (queryBuilder as any)[functionName](value); // run
            break;
        case 'limit':
            // must throw on findOne queries
            if (rxQuery.op === 'findOne') {
                throw newRxError('QU6');
            } else {
                (queryBuilder as any)[functionName](value); // run
            }
            break;
        default:
            (queryBuilder as any)[functionName](value); // run
    }


    const queryBuilderJson = queryBuilder.toJSON();
    const newQuery = new RxQueryBase(
        rxQuery.op,
        queryBuilderJson.query,
        rxQuery.collection
    ) as RxQuery;
    if (queryBuilderJson.path) {
        newQuery.other[RXQUERY_OTHER_FLAG] = queryBuilderJson.path;
    }

    const tunneled = tunnelQueryCache(newQuery);
    return tunneled;
}

export function applyBuildingStep(
    proto: any,
    functionName: string
): void {
    proto[functionName] = function (this: RxQuery, value: any) {
        return runBuildingStep(this, functionName, value);
    };
}

export const RxDBQueryBuilderPlugin: RxPlugin = {
    rxdb: true,
    prototypes: {
        RxQuery(proto: any) {
            [
                'where',
                'equals',
                'eq',
                'or',
                'nor',
                'and',
                'mod',
                'exists',
                'elemMatch',
                'sort'
            ].forEach(attribute => {
                applyBuildingStep(proto, attribute);
            });
            OTHER_MANGO_ATTRIBUTES.forEach(attribute => {
                applyBuildingStep(proto, attribute);
            });
            OTHER_MANGO_OPERATORS.forEach(operator => {
                applyBuildingStep(proto, operator);
            });
        }
    }
};
