import { QueryMatcher } from 'event-reduce-js';
import type {
    DexiePreparedQuery,
    RxDocumentData,
    RxQueryPlan,
    RxStorageQueryResult
} from '../../types';
import {
    dexieReplaceIfStartsWithPipe,
    DEXIE_DOCS_TABLE_NAME,
    fromDexieToStorage
} from './dexie-helper';
import { RxStorageDexieStatics } from './dexie-statics';
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

    let ret: any;
    /**
     * If index has only one field,
     * we have to pass the keys directly, not the key arrays.
     */
    if (queryPlan.index.length === 1) {
        ret = IDBKeyRange.bound(
            queryPlan.startKeys[0],
            queryPlan.endKeys[0],
            queryPlan.inclusiveStart,
            queryPlan.inclusiveEnd
        );
    } else {
        ret = IDBKeyRange.bound(
            queryPlan.startKeys,
            queryPlan.endKeys,
            queryPlan.inclusiveStart,
            queryPlan.inclusiveEnd
        );
    }
    return ret;
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

    const skip = query.skip ? query.skip : 0;
    const limit = query.limit ? query.limit : Infinity;
    const skipPlusLimit = skip + limit;
    const queryPlan = preparedQuery.queryPlan;

    let queryMatcher: QueryMatcher<RxDocumentData<RxDocType>> | false = false;
    if (!queryPlan.selectorSatisfiedByIndex) {
        queryMatcher = RxStorageDexieStatics.getQueryMatcher(
            instance.schema,
            preparedQuery
        );
    }

    const keyRange = getKeyRangeByQueryPlan(
        queryPlan,
        (state.dexieDb as any)._options.IDBKeyRange
    );

    const queryPlanFields: string[] = queryPlan.index;

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
                index = store.index(indexName);
            }
            const cursorReq = index.openCursor(keyRange);
            await new Promise<void>(res => {
                cursorReq.onsuccess = function (e: any) {
                    const cursor = e.target.result;
                    if (cursor) {
                        // We have a record in cursor.value
                        const docData = fromDexieToStorage(cursor.value);
                        if (
                            !docData._deleted &&
                            (!queryMatcher || queryMatcher(docData))
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
                            queryPlan.sortFieldsSameAsIndexFields &&
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


    if (!queryPlan.sortFieldsSameAsIndexFields) {
        const sortComparator = RxStorageDexieStatics.getSortComparator(instance.schema, preparedQuery);
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


export async function dexieCount<RxDocType>(
    instance: RxStorageInstanceDexie<RxDocType>,
    preparedQuery: DexiePreparedQuery<RxDocType>
): Promise<number> {
    const state = await instance.internals;
    const queryPlan = preparedQuery.queryPlan;
    const queryPlanFields: string[] = queryPlan.index;

    const keyRange = getKeyRangeByQueryPlan(
        queryPlan,
        (state.dexieDb as any)._options.IDBKeyRange
    );
    let count: number = -1;
    await state.dexieDb.transaction(
        'r',
        state.dexieTable,
        async (dexieTx) => {
            const tx = (dexieTx as any).idbtrans;
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
                index = store.index(indexName);
            }

            const request = index.count(keyRange);
            count = await new Promise<number>((res, rej) => {
                request.onsuccess = function () {
                    res(request.result);
                };
                request.onerror = (err: any) => rej(err);
            });
        }
    );
    return count;
}
