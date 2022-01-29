import { getPrimaryFieldOfPrimaryKey } from '../../../rx-schema';
import type { MangoQuery, PreparedQuery, RxJsonSchema, RxStorageQueryResult } from '../../../types';
import { clone, ensureNotFalsy } from '../../../util';
import { pouchSwapIdToPrimaryString } from '../../pouchdb';
import { preparePouchDbQuery } from '../../pouchdb/pouch-statics';
import { DEXIE_DOCS_TABLE_NAME, stripDexieKey } from '../dexie-helper';
import { RxStorageDexieStatics } from '../rx-storage-dexie';
import type { RxStorageInstanceDexie } from '../rx-storage-instance-dexie';
import { generateKeyRange } from './pouchdb-find-query-planer/indexeddb-find';
import { planQuery } from './pouchdb-find-query-planer/query-planner';


/**
 * Use the pouchdb query planner to determine which index
 * must be used to get the correct documents.
 * @link https://www.bennadel.com/blog/3258-understanding-the-query-plan-explained-by-the-find-plugin-in-pouchdb-6-2-0.htm
 */
export function getPouchQueryPlan<RxDocType>(
    schema: RxJsonSchema<RxDocType>,
    query: MangoQuery<RxDocType>
) {
    const primaryKey = getPrimaryFieldOfPrimaryKey(schema.primaryKey);

    /**
     * Store the query plan together with the prepared query
     * to improve performance
     * We use the query planner of pouchdb-find.
     */
    const pouchCompatibleIndexes = [
        // the primary key is always a free index
        {
            ddoc: null as any,
            name: '_all_docs',
            type: 'special',
            def: {
                fields: [
                    {
                        '_id': 'asc'
                    }
                ] as any[]
            }
        }
    ];
    if (schema.indexes) {
        schema.indexes.forEach(index => {
            index = Array.isArray(index) ? index : [index];
            const indexName = index.join(',');
            pouchCompatibleIndexes.push({
                ddoc: '_design/idx-rxdb-index-' + indexName,
                name: 'idx-rxdb-index-' + indexName,
                type: 'json',
                def: {
                    fields: index.map(indexPart => {
                        const useKey = indexPart === primaryKey ? '_id' : indexPart;
                        return { [useKey]: 'asc' };
                    })
                }
            });
        })
    }


    /**
     * Because pouchdb-find is buggy AF,
     * we have to apply the same hacks to the query
     * as we do with the PouchDB RxStorage.
     * Only then we can use that monkeypatched
     * query with the query planner.
     */
    const pouchdbCompatibleQuery = preparePouchDbQuery(
        schema,
        clone(query)
    );

    const pouchQueryPlan = planQuery(
        pouchdbCompatibleQuery,
        pouchCompatibleIndexes
    );

    return pouchQueryPlan;
}


export function getDexieKeyRange(
    queryPlan: any,
    low: any,
    height: any,
    /**
     * The window.IDBKeyRange object.
     * Can be swapped out in other environments
     */
    IDBKeyRange?: any
): any {

    if (!IDBKeyRange) {
        if (typeof window === 'undefined') {
            throw new Error('IDBKeyRange missing');
        } else {
            IDBKeyRange = window.IDBKeyRange;
        }
    }

    return generateKeyRange(queryPlan.queryOpts, IDBKeyRange, low, height);
}


/**
 * Runs mango queries over the Dexie.js database.
 */
export async function dexieQuery<RxDocType>(
    instance: RxStorageInstanceDexie<RxDocType>,
    preparedQuery: PreparedQuery<RxDocType>
): Promise<RxStorageQueryResult<RxDocType>> {
    const state = await instance.internals;
    const queryMatcher = RxStorageDexieStatics.getQueryMatcher(
        instance.schema,
        preparedQuery
    );
    const sortComparator = RxStorageDexieStatics.getSortComparator(instance.schema, preparedQuery);

    const skip = preparedQuery.skip ? preparedQuery.skip : 0;
    const limit = preparedQuery.limit ? preparedQuery.limit : Infinity;
    const skipPlusLimit = skip + limit;
    const queryPlan = (preparedQuery as any).pouchQueryPlan;
    const keyRange = getDexieKeyRange(
        queryPlan,
        Number.NEGATIVE_INFINITY,
        (state.dexieDb as any)._maxKey,
        (state.dexieDb as any)._options.IDBKeyRange
    );

    const queryPlanFields: string[] = queryPlan.index.def.fields
        .map((fieldObj: any) => Object.keys(fieldObj)[0])
        .map((field: any) => pouchSwapIdToPrimaryString(instance.primaryPath, field));

    const sortFields = ensureNotFalsy((preparedQuery as MangoQuery<RxDocType>).sort)
        .map(sortPart => Object.keys(sortPart)[0]);

    /**
     * If the cursor iterated over the same index that
     * would be used for sorting, we do not have to sort the results.
     */
    const sortFieldsSameAsIndexFields = queryPlanFields.join(',') === sortFields.join(',');
    /**
     * Also manually sort if one part of the sort is in descending order
     * because all our indexes are ascending.
     * TODO should we be able to define descending indexes?
     */
    const isOneSortDescending = preparedQuery.sort.find((sortPart: any) => Object.values(sortPart)[0] === 'desc');
    const mustManuallyResort = isOneSortDescending || !sortFieldsSameAsIndexFields;


    let rows: any[] = [];
    await state.dexieDb.transaction(
        'r',
        state.dexieTable,
        async (dexieTx) => {
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
                    indexName = queryPlanFields[0];
                } else {
                    indexName = '[' + queryPlanFields.join('+') + ']';
                }
                index = store.index(indexName);
            }


            const cursorReq = index.openCursor(keyRange);
            await new Promise<void>(res => {
                cursorReq.onsuccess = function (e: any) {
                    const cursor = e.target.result;
                    if (cursor) {
                        // We have a record in cursor.value
                        const docData = cursor.value;
                        if (
                            queryMatcher(docData)
                        ) {
                            rows.push(cursor.value);
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
     * Strip internal keys as last operation
     * so it has to run over less documents.
     */
    rows = rows
        .map(docData => stripDexieKey(docData))


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
