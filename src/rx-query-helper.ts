import { getPrimaryFieldOfPrimaryKey } from './rx-schema-helper';
import type { FilledMangoQuery, MangoQuery, RxDocumentData, RxJsonSchema } from './types';
import { firstPropertyNameOfObject, flatClone } from './util';

/**
 * Normalize the query to ensure we have all fields set
 * and queries that represent the same query logic are detected as equal by the caching.
 */
export function normalizeMangoQuery<RxDocType>(
    schema: RxJsonSchema<RxDocumentData<RxDocType>>,
    mangoQuery: MangoQuery<RxDocType>
): FilledMangoQuery<RxDocType> {
    const primaryKey: string = getPrimaryFieldOfPrimaryKey(schema.primaryKey);
    mangoQuery = flatClone(mangoQuery);

    if (typeof mangoQuery.skip !== 'number') {
        mangoQuery.skip = 0;
    }

    /**
     * To ensure a deterministic sorting,
     * we have to ensure the primary key is always part
     * of the sort query.
     * Primary sorting is added as last sort parameter,
     * similiar to how we add the primary key to indexes that do not have it.
     */
    if (!mangoQuery.sort) {
        mangoQuery.sort = [{ [primaryKey]: 'asc' }] as any;
    } else {
        const isPrimaryInSort = mangoQuery.sort
            .find(p => firstPropertyNameOfObject(p) === primaryKey);
        if (!isPrimaryInSort) {
            mangoQuery.sort = mangoQuery.sort.slice(0);
            mangoQuery.sort.push({ [primaryKey]: 'asc' } as any);
        }
    }

    /**
     * Ensure that if an index is specified,
     * the primaryKey is inside of it.
     */
    if (mangoQuery.index) {
        const indexAr = Array.isArray(mangoQuery.index) ? mangoQuery.index.slice(0) : [mangoQuery.index];
        if (!indexAr.includes(primaryKey)) {
            indexAr.push(primaryKey);
        }
        mangoQuery.index = indexAr;
    }

    return mangoQuery as any;
}
