import { getPrimaryFieldOfPrimaryKey } from '../../../rx-schema-helper';
import type {
    DexiePreparedQuery,
    MangoQuery,
    RxDocumentData,
    RxJsonSchema,
    RxQueryPlan,
    RxStorageQueryResult
} from '../../../types';
import { clone, ensureNotFalsy } from '../../../util';
import {
    getPouchIndexDesignDocNameByIndex,
    POUCHDB_DESIGN_PREFIX,
    pouchSwapIdToPrimaryString
} from '../../pouchdb';
import { preparePouchDbQuery } from '../../pouchdb/pouch-statics';
import {
    dexieReplaceIfStartsWithPipe,
    DEXIE_DOCS_TABLE_NAME,
    fromDexieToStorage
} from '../dexie-helper';
import { RxStorageDexieStatics } from '../rx-storage-dexie';
import type { RxStorageInstanceDexie } from '../rx-storage-instance-dexie';
import { generateKeyRange } from './pouchdb-find-query-planer/indexeddb-find';
import { planQuery } from './pouchdb-find-query-planer/query-planner';


/**
 * Use the pouchdb query planner to determine which index
 * must be used to get the correct documents.
 * @link https://www.bennadel.com/blog/3258-understanding-the-query-plan-explained-by-the-find-plugin-in-pouchdb-6-2-0.htm
 * 
 * 
 * TODO use batched cursor
 * @link https://nolanlawson.com/2021/08/22/speeding-up-indexeddb-reads-and-writes/
 */
export function getPouchQueryPlan<RxDocType>(
    schema: RxJsonSchema<RxDocumentData<RxDocType>>,
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
            const pouchIndex = index.map(indexPart => {
                if (indexPart === primaryKey) {
                    return '_id';
                } else {
                    return indexPart;
                }
            });
            const indexName = getPouchIndexDesignDocNameByIndex(pouchIndex);
            pouchCompatibleIndexes.push({
                ddoc: POUCHDB_DESIGN_PREFIX + indexName,
                name: indexName,
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

    // transform back _id to primaryKey
    pouchQueryPlan.index.def.fields = pouchQueryPlan.index.def.fields.map((field: any) => {
        const [fieldName, value] = Object.entries(field)[0];
        if (fieldName === '_id') {
            return { [primaryKey]: value };
        } else {
            return { [fieldName]: value };
        }
    });

    return pouchQueryPlan;
}


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
