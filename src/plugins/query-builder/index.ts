import {
    createQueryBuilder,
    OTHER_MANGO_ATTRIBUTES,
    OTHER_MANGO_OPERATORS
} from './mquery/nosql-query-builder';
import type { RxPlugin, RxQuery } from '../../types';
import { RxQueryBase, tunnelQueryCache } from '../../rx-query';
import { clone } from '../../util';

// if the query-builder plugin is used, we have to save it's last path
const RXQUERY_OTHER_FLAG = 'queryBuilderPath';

export function runBuildingStep<RxDocumentType, RxQueryResult>(
    rxQuery: RxQuery<RxDocumentType, RxQueryResult>,
    functionName: string,
    value: any
): RxQuery<RxDocumentType, RxQueryResult> {
    const queryBuilder = createQueryBuilder(clone(rxQuery.mangoQuery));
    if (rxQuery.other[RXQUERY_OTHER_FLAG]) {
        queryBuilder._path = rxQuery.other[RXQUERY_OTHER_FLAG];
    }

    (queryBuilder as any)[functionName](value); // run

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

export * from './mquery/nosql-query-builder';

export const RxDBQueryBuilderPlugin: RxPlugin = {
    name: 'query-builder',
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
