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
import { ensureNotFalsy } from '../../plugins/utils/index.ts';
import { getQueryMatcher, getSortComparator } from '../../rx-query-helper.ts';
import { RxStorageInstanceDenoKV } from "./rx-storage-instance-denokv.ts";
import { DENOKV_DOCUMENT_ROOT_PATH, getDenoKVIndexName } from "./denokv-helper.ts";

export async function queryDenoKV<RxDocType>(
    instance: RxStorageInstanceDenoKV<RxDocType>,
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

    const kv = await instance.kvPromise;

    const indexForName = queryPlanFields.slice(0);
    const indexName = getDenoKVIndexName(indexForName);
    const indexMeta = ensureNotFalsy(instance.internals.indexes[indexName]);

    let lowerBound: any[] = queryPlan.startKeys;
    let lowerBoundString = getStartIndexStringFromLowerBound(
        instance.schema,
        indexForName,
        lowerBound
    );
    if (!queryPlan.inclusiveStart) {
        lowerBoundString = changeIndexableStringByOneQuantum(lowerBoundString, 1);
    }

    let upperBound: any[] = queryPlan.endKeys;
    let upperBoundString = getStartIndexStringFromUpperBound(
        instance.schema,
        indexForName,
        upperBound
    );

    if (queryPlan.inclusiveEnd) {
        upperBoundString = changeIndexableStringByOneQuantum(upperBoundString, +1);
    }


    let result: RxDocumentData<RxDocType>[] = [];


    /**
     * TODO for whatever reason the keySelectors like firstGreaterThan etc.
     * do not work properly. So we have to hack here to find the correct
     * document in case lowerBoundString===upperBoundString.
     * This likely must be fixed in the foundationdb library.
     * When it is fixed, we do not need this if-case and instead
     * can rely on .getRangeBatch() in all cases.
     */
    if (lowerBoundString === upperBoundString) {
        const singleDocResult = await kv.get([instance.keySpace, indexMeta.indexId, lowerBoundString], instance.kvOptions);
        if (singleDocResult.value) {
            const docId: string = singleDocResult.value;
            const docDataResult = await kv.get([instance.keySpace, DENOKV_DOCUMENT_ROOT_PATH, docId], instance.kvOptions);
            const docData = ensureNotFalsy(docDataResult.value);
            if (!queryMatcher || queryMatcher(docData)) {
                result.push(docData);
            }
        }
        return {
            documents: result
        };
    }

    const range = kv.list({
        start: [instance.keySpace, indexMeta.indexId, lowerBoundString],
        end: [instance.keySpace, indexMeta.indexId, upperBoundString]
    }, {
        consistency: instance.settings.consistencyLevel,
        limit: (!mustManuallyResort && queryPlan.selectorSatisfiedByIndex) ? skipPlusLimit : undefined,
        batchSize: instance.settings.batchSize
    });

    for await (const indexDocEntry of range) {
        const docId = indexDocEntry.value;
        const docDataResult = await kv.get([instance.keySpace, DENOKV_DOCUMENT_ROOT_PATH, docId], instance.kvOptions);
        const docData = ensureNotFalsy(docDataResult.value);
        if (!queryMatcher || queryMatcher(docData)) {
            result.push(docData);
        }
        if (
            !mustManuallyResort &&
            result.length === skipPlusLimit
        ) {
            break;
        }
    }

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
