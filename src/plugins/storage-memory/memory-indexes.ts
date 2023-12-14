import { getIndexableStringMonad } from '../../custom-index.ts';
import { getPrimaryFieldOfPrimaryKey } from '../../rx-schema-helper.ts';
import type { RxDocumentData, RxJsonSchema } from '../../types/index.d.ts';
import { toArray } from '../../plugins/utils/index.ts';
import type { MemoryStorageInternals } from './memory-types.ts';

export function addIndexesToInternalsState<RxDocType>(
    state: MemoryStorageInternals<RxDocType>,
    schema: RxJsonSchema<RxDocumentData<RxDocType>>
) {
    const primaryPath = getPrimaryFieldOfPrimaryKey(schema.primaryKey);
    const useIndexes: string[][] = !schema.indexes ? [] : schema.indexes.map(row => toArray(row)) as any;

    // we need this index for running cleanup()
    useIndexes.push([
        '_deleted',
        '_meta.lwt',
        primaryPath
    ]);


    useIndexes.forEach(indexAr => {
        state.byIndex[getMemoryIndexName(indexAr)] = {
            index: indexAr,
            docsWithIndex: [],
            getIndexableString: getIndexableStringMonad(schema, indexAr)
        };
    });
}


export function getMemoryIndexName(index: string[]): string {
    return index.join(',');
}
