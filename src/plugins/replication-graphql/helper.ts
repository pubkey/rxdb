import { WithDeleted } from '../../types';
import { flatClone } from '../../util';

export const GRAPHQL_REPLICATION_PLUGIN_IDENTITY_PREFIX = 'rxdb-replication-graphql-';

// does nothing
export const DEFAULT_MODIFIER = (d: any) => Promise.resolve(d);



export function swapDeletedFlagToDeleted<RxDocType>(
    deletedFlag: string,
    doc: RxDocType
): WithDeleted<RxDocType> {
    const useDoc: WithDeleted<RxDocType> = flatClone(doc) as any;
    if (deletedFlag !== '_deleted') {
        const isDeleted = !!(useDoc as any)[deletedFlag];
        useDoc._deleted = isDeleted;
        delete (useDoc as any)[deletedFlag];
        return useDoc;
    }
    return useDoc;
}

export function swapDeletedToDeletedFlag<RxDocType>(
    deletedFlag: string,
    doc: WithDeleted<RxDocType>
): RxDocType {
    const changedDoc: any = flatClone(doc);
    if (deletedFlag !== '_deleted') {
        const isDeleted = !!changedDoc._deleted;
        changedDoc[deletedFlag] = isDeleted;
        delete changedDoc._deleted;
    }
    return changedDoc;
}
