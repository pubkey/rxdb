import { QueryMatcher } from 'event-reduce-js';
import {
    getStartIndexStringFromLowerBound,
    getStartIndexStringFromUpperBound
} from '../../custom-index';
import type {
    RxDocumentData,
    RxStorageQueryResult
} from '../../types';
import { ensureNotFalsy } from '../../plugins/utils';
import { RxStorageDexieStatics } from '../storage-dexie';
import { getFoundationDBIndexName } from './foundationdb-helpers';
import type {
    FoundationDBPreparedQuery
} from './foundationdb-types';
import { RxStorageInstanceFoundationDB } from './rx-storage-instance-foundationdb';

export async function queryFoundationDB<RxDocType>(
    instance: RxStorageInstanceFoundationDB<RxDocType>,
    preparedQuery: FoundationDBPreparedQuery<RxDocType>
): Promise<RxStorageQueryResult<RxDocType>> {
    const queryPlan = preparedQuery.queryPlan;
    const query = preparedQuery.query;
    const skip = query.skip ? query.skip : 0;
    const limit = query.limit ? query.limit : Infinity;
    const skipPlusLimit = skip + limit;
    const queryPlanFields: string[] = queryPlan.index;
    const mustManuallyResort = !queryPlan.sortFieldsSameAsIndexFields;


    let queryMatcher: QueryMatcher<RxDocumentData<RxDocType>> | false = false;
    if (!queryPlan.selectorSatisfiedByIndex) {
        queryMatcher = RxStorageDexieStatics.getQueryMatcher(
            instance.schema,
            preparedQuery
        );
    }

    const dbs = await instance.internals.dbsPromise;


    const indexForName = queryPlanFields.slice(0);
    indexForName.unshift('_deleted');
    const indexName = getFoundationDBIndexName(indexForName);
    const indexDB = ensureNotFalsy(dbs.indexes[indexName]).db;

    let lowerBound: any[] = queryPlan.startKeys;
    lowerBound = [false].concat(lowerBound);
    const lowerBoundString = getStartIndexStringFromLowerBound(
        instance.schema,
        indexForName,
        lowerBound,
        queryPlan.inclusiveStart
    );

    let upperBound: any[] = queryPlan.endKeys;
    upperBound = [false].concat(upperBound);
    const upperBoundString = getStartIndexStringFromUpperBound(
        instance.schema,
        indexForName,
        upperBound,
        queryPlan.inclusiveEnd
    );
    let result = await dbs.root.doTransaction(async (tx: any) => {
        const innerResult: RxDocumentData<RxDocType>[] = [];
        const indexTx = tx.at(indexDB.subspace);
        const mainTx = tx.at(dbs.main.subspace);

        const range = indexTx.getRangeBatch(
            lowerBoundString,
            upperBoundString,
            {
                // TODO these options seem to be broken in the foundationdb node bindings
                // limit: instance.settings.batchSize,
                // streamingMode: StreamingMode.Exact
            }
        );
        let done = false;
        while (!done) {
            const next = await range.next();
            if (next.done) {
                done = true;
                break;
            }
            const docIds = next.value.map((row: string[]) => row[1]);
            const docsData: RxDocumentData<RxDocType>[] = await Promise.all(docIds.map((docId: string) => mainTx.get(docId)));
            docsData.forEach((docData) => {
                if (!done) {
                    if (!queryMatcher || queryMatcher(docData)) {
                        innerResult.push(docData);
                    }
                }
                if (
                    !mustManuallyResort &&
                    innerResult.length === skipPlusLimit
                ) {
                    done = true;
                    range.return();
                }
            });
        }
        return innerResult;
    });
    if (mustManuallyResort) {
        const sortComparator = RxStorageDexieStatics.getSortComparator(instance.schema, preparedQuery);
        result = result.sort(sortComparator);
    }

    // apply skip and limit boundaries.
    result = result.slice(skip, skipPlusLimit);

    return {
        documents: result
    };
}
