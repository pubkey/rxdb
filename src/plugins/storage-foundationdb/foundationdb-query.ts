import {
    changeIndexableStringByOneQuantum,
    getStartIndexStringFromLowerBound,
    getStartIndexStringFromUpperBound
} from '../../custom-index.ts';
import type {
    PreparedQuery,
    QueryMatcher,
    RxDocumentData,
    RxStorageQueryResult
} from '../../types/index.d.ts';
import { ensureNotFalsy, lastOfArray } from '../../plugins/utils/index.ts';
import { getFoundationDBIndexName } from './foundationdb-helpers.ts';
import { RxStorageInstanceFoundationDB } from './rx-storage-instance-foundationdb.ts';
import { getQueryMatcher, getSortComparator } from '../../rx-query-helper.ts';

export async function queryFoundationDB<RxDocType>(
    instance: RxStorageInstanceFoundationDB<RxDocType>,
    preparedQuery: PreparedQuery<RxDocType>
): Promise<RxStorageQueryResult<RxDocType>> {
    const queryPlan = preparedQuery.queryPlan;
    const query = preparedQuery.query;
    const skip = query.skip ? query.skip : 0;
    const limit = query.limit ? query.limit : Infinity;
    const skipPlusLimit = skip + limit;
    const queryPlanFields: string[] = queryPlan.index;
    const mustManuallyResort = !queryPlan.sortSatisfiedByIndex;


    let queryMatcher: QueryMatcher<RxDocumentData<RxDocType>> | false = false;
    if (!queryPlan.selectorSatisfiedByIndex) {
        queryMatcher = getQueryMatcher(
            instance.schema,
            preparedQuery.query
        );
    }

    const dbs = await instance.internals.dbsPromise;


    const indexForName = queryPlanFields.slice(0);
    const indexName = getFoundationDBIndexName(indexForName);
    const indexDB = ensureNotFalsy(dbs.indexes[indexName]).db;

    let lowerBound: any[] = queryPlan.startKeys;
    let lowerBoundString = getStartIndexStringFromLowerBound(
        instance.schema,
        indexForName,
        lowerBound
    );

    let upperBound: any[] = queryPlan.endKeys;
    let upperBoundString = getStartIndexStringFromUpperBound(
        instance.schema,
        indexForName,
        upperBound
    );
    let result: RxDocumentData<RxDocType>[] = await dbs.root.doTransaction(async (tx: any) => {
        const innerResult: RxDocumentData<RxDocType>[] = [];
        const indexTx = tx.at(indexDB.subspace);
        const mainTx = tx.at(dbs.main.subspace);


        /**
         * TODO for whatever reason the keySelectors like firstGreaterThan etc.
         * do not work properly. So we have to hack here to find the correct
         * document in case lowerBoundString===upperBoundString.
         * This likely must be fixed in the foundationdb library.
         * When it is fixed, we do not need this if-case and instead
         * can rely on .getRangeBatch() in all cases.
         */
        if (lowerBoundString === upperBoundString) {
            const docId: string = await indexTx.get(lowerBoundString);
            if (docId) {
                const docData = await mainTx.get(docId);
                if (!queryMatcher || queryMatcher(docData)) {
                    innerResult.push(docData);
                }
            }
            return innerResult;
        }

        if (!queryPlan.inclusiveStart) {
            lowerBoundString = changeIndexableStringByOneQuantum(lowerBoundString, 1);
        }
        if (queryPlan.inclusiveEnd) {
            upperBoundString = changeIndexableStringByOneQuantum(upperBoundString, +1);
        }

        const range = indexTx.getRangeBatch(
            lowerBoundString,
            upperBoundString,
            // queryPlan.inclusiveStart ? keySelector.firstGreaterThan(lowerBoundString) : keySelector.firstGreaterOrEqual(lowerBoundString),
            // queryPlan.inclusiveEnd ? keySelector.lastLessOrEqual(upperBoundString) : keySelector.lastLessThan(upperBoundString),
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
            const rows: [string, string] = next.value;

            if (!queryPlan.inclusiveStart) {
                const firstRow = rows[0];
                if (
                    firstRow &&
                    firstRow[0] === lowerBoundString
                ) {
                    rows.shift();
                }
            }
            if (!queryPlan.inclusiveEnd) {
                const lastRow = lastOfArray(rows);
                if (
                    lastRow &&
                    lastRow[0] === upperBoundString
                ) {
                    rows.pop();
                }
            }

            const docIds = rows.map(row => row[1]);
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
        const sortComparator = getSortComparator(instance.schema, preparedQuery.query);
        result = result.sort(sortComparator);
    }

    // apply skip and limit boundaries.
    result = result.slice(skip, skipPlusLimit);

    return {
        documents: result
    };
}
