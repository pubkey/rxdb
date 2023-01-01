import type {
    RxDocumentData,
    WithDeleted
} from '../types';
import {
    createRevision,
    flatClone,
    getDefaultRevision,
    now
} from '../plugins/utils';

export function docStateToWriteDoc<RxDocType>(
    databaseInstanceToken: string,
    docState: WithDeleted<RxDocType>,
    previous?: RxDocumentData<RxDocType>
): RxDocumentData<RxDocType> {
    const docData: RxDocumentData<RxDocType> = Object.assign(
        {},
        docState,
        {
            _attachments: {},
            _meta: {
                lwt: now()
            },
            _rev: getDefaultRevision()
        }
    );
    docData._rev = createRevision(
        databaseInstanceToken,
        previous
    );
    return docData;
}

export function writeDocToDocState<RxDocType>(
    writeDoc: RxDocumentData<RxDocType>
): WithDeleted<RxDocType> {
    const ret = flatClone(writeDoc);
    delete (ret as any)._attachments;
    delete (ret as any)._meta;
    delete (ret as any)._rev;
    return ret;
}
