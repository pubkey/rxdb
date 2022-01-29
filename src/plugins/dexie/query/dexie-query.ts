import { getPrimaryFieldOfPrimaryKey } from '../../../rx-schema';
import type { MangoQuery, RxJsonSchema } from '../../../types';
import { clone } from '../../../util';
import { preparePouchDbQuery } from '../../pouchdb/pouch-statics';
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

    console.log('pouchdbCompatibleQuery:');
    console.dir(pouchdbCompatibleQuery);
    console.log('pouchCompatibleIndexes:');
    console.log(JSON.stringify(pouchCompatibleIndexes, null, 4));

    const pouchQueryPlan = planQuery(
        pouchdbCompatibleQuery,
        pouchCompatibleIndexes
    );
    console.log('queryPlan:');
    console.log(JSON.stringify(pouchQueryPlan, null, 4));
    console.log('---------------------------------------------------------');
    console.log('---------------------------------------------------------');
    console.log('---------------------------------------------------------');

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
