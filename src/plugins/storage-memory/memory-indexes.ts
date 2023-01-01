import { getIndexableStringMonad } from '../../custom-index';
import { getPrimaryFieldOfPrimaryKey } from '../../rx-schema-helper';
import type { RxDocumentData, RxJsonSchema } from '../../types';
import { toArray } from '../../plugins/utils';
import type { MemoryStorageInternals } from './memory-types';

export function addIndexesToInternalsState<RxDocType>(
    state: MemoryStorageInternals<RxDocType>,
    schema: RxJsonSchema<RxDocumentData<RxDocType>>
) {
    const primaryPath = getPrimaryFieldOfPrimaryKey(schema.primaryKey);
    const useIndexes: string[][] = !schema.indexes ? [] : schema.indexes.map(row => toArray(row)) as any;

    // we need this as default index
    useIndexes.push([
        primaryPath
    ]);

    // we need this index for running cleanup()
    useIndexes.push([
        '_meta.lwt',
        primaryPath
    ]);


    useIndexes.forEach(indexAr => {
        /**
         * Running a query will only return non-deleted documents
         * so all indexes must have the the deleted field as first index field.
         */
        indexAr.unshift('_deleted');

        state.byIndex[getMemoryIndexName(indexAr)] = {
            index: indexAr,
            docsWithIndex: [],
            getIndexableString: getIndexableStringMonad(schema, indexAr)
        };
    });

    // we need this index for the changes()
    const changesIndex = [
        '_meta.lwt',
        primaryPath
    ];
    const indexName = getMemoryIndexName(changesIndex);
    state.byIndex[indexName] = {
        index: changesIndex,
        docsWithIndex: [],
        getIndexableString: getIndexableStringMonad(schema, changesIndex)
    };

}


export function getMemoryIndexName(index: string[]): string {
    return index.join(',');
}
