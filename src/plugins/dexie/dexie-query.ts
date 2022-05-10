import type {
    DexiePreparedQuery,
    RxQueryPlan,
    RxStorageQueryResult
} from '../../types';
import {
    dexieReplaceIfStartsWithPipe,
    DEXIE_DOCS_TABLE_NAME,
    fromDexieToStorage
} from './dexie-helper';
import { RxStorageDexieStatics } from './rx-storage-dexie';
import type { RxStorageInstanceDexie } from './rx-storage-instance-dexie';


export function getKeyRangeByQueryPlan(
    queryPlan: RxQueryPlan,
    IDBKeyRange?: any
) {
    if (!IDBKeyRange) {
        if (typeof window === 'undefined') {
            throw new Error('IDBKeyRange missing');
        } else {
            IDBKeyRange = window.IDBKeyRange;
        }
    }

    /**
     * If index has only one field,
     * we have to pass the keys directly, not the key arrays.
     */
    if (queryPlan.index.length === 1) {
        return IDBKeyRange.bound(
            queryPlan.startKeys[0],
            queryPlan.endKeys[0],
            queryPlan.inclusiveStart,
            queryPlan.inclusiveEnd
        );
    }

    return IDBKeyRange.bound(
        queryPlan.startKeys,
        queryPlan.endKeys,
        queryPlan.inclusiveStart,
        queryPlan.inclusiveEnd
    );

}


/**
 * Runs mango queries over the Dexie.js database.
 */
export async function dexieQuery<RxDocType>(
    instance: RxStorageInstanceDexie<RxDocType>,
    preparedQuery: DexiePreparedQuery<RxDocType>
): Promise<RxStorageQueryResult<RxDocType>> {
    const state = await instance.internals;
    const query = preparedQuery.query;
    const queryMatcher = RxStorageDexieStatics.getQueryMatcher(
        instance.schema,
        preparedQuery
    );
    const sortComparator = RxStorageDexieStatics.getSortComparator(instance.schema, preparedQuery);

    const skip = query.skip ? query.skip : 0;
    const limit = query.limit ? query.limit : Infinity;
    const skipPlusLimit = skip + limit;
    const queryPlan = preparedQuery.queryPlan;

    const keyRange = getKeyRangeByQueryPlan(
        queryPlan,
        (state.dexieDb as any)._options.IDBKeyRange
    );

    console.log('keyRange:');
    console.dir(keyRange);

    const queryPlanFields: string[] = queryPlan.index;
    console.log('queryPlanFields:');
    console.dir(queryPlanFields);

    /**
     * Also manually sort if one part of the sort is in descending order
     * because all our indexes are ascending.
     * TODO should we be able to define descending indexes?
     */
    const isOneSortDescending = query.sort.find((sortPart: any) => Object.values(sortPart)[0] === 'desc');
    const mustManuallyResort = isOneSortDescending || !queryPlan.sortFieldsSameAsIndexFields;


    let rows: any[] = [];
    await state.dexieDb.transaction(
        'r',
        state.dexieTable,
        async (dexieTx) => {
            /**
             * TODO here we use the native IndexedDB transaction
             * to get the cursor.
             * Instead we should not leave Dexie.js API and find
             * a way to create the cursor with Dexie.js.
             */
            const tx = (dexieTx as any).idbtrans;

            // const nativeIndexedDB = state.dexieDb.backendDB();
            // const trans = nativeIndexedDB.transaction([DEXIE_DOCS_TABLE_NAME], 'readonly');

            const store = tx.objectStore(DEXIE_DOCS_TABLE_NAME);
            let index: any;
            if (
                queryPlanFields.length === 1 &&
                queryPlanFields[0] === instance.primaryPath
            ) {
                index = store;
            } else {
                let indexName: string;
                if (queryPlanFields.length === 1) {
                    indexName = dexieReplaceIfStartsWithPipe(queryPlanFields[0]);
                } else {
                    indexName = '[' +
                        queryPlanFields
                            .map(field => dexieReplaceIfStartsWithPipe(field))
                            .join('+')
                        + ']';
                }

                console.log('indexName: ' + indexName);
                index = store.index(indexName);
            }

            console.dir(queryPlan);
            console.log('useIndexStore:');
            console.dir(index);

            const cursorReq = index.openCursor(keyRange);
            await new Promise<void>(res => {
                cursorReq.onsuccess = function (e: any) {
                    const cursor = e.target.result;
                    if (cursor) {
                        // We have a record in cursor.value
                        const docData = fromDexieToStorage(cursor.value);

                        console.log('cursor got doc data:');
                        console.dir(docData);

                        if (
                            queryMatcher(docData)
                        ) {
                            rows.push(docData);
                        }

                        /**
                         * If we do not have to manually sort
                         * and have enough documents,
                         * we can abort iterating over the cursor
                         * because we already have every relevant document.
                         */
                        if (
                            !mustManuallyResort &&
                            rows.length === skipPlusLimit
                        ) {
                            res();
                        } else {
                            cursor.continue();
                        }
                    } else {
                        // Iteration complete
                        res();
                    }
                };
            });


        }
    );


    if (mustManuallyResort) {
        rows = rows.sort(sortComparator);
    }

    // apply skip and limit boundaries.
    rows = rows.slice(skip, skipPlusLimit);

    /**
     * Comment this in for debugging to check all fields in the database.
     */
    // const docsInDb = await state.dexieTable.filter(queryMatcher).toArray();
    // let documents = docsInDb
    //     .map(docData => stripDexieKey(docData))
    //     .sort(sortComparator);
    // if (preparedQuery.skip) {
    //     documents = documents.slice(preparedQuery.skip);
    // }
    // if (preparedQuery.limit && documents.length > preparedQuery.limit) {
    //     documents = documents.slice(0, preparedQuery.limit);
    // }



    return {
        documents: rows
    };
}
