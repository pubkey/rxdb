import type {
    RxDocumentData,
    RxDocumentWriteData,
    WithDeletedAndAttachments
} from '../types';
import {
    createRevision,
    flatClone,
    getDefaultRevision,
    now
} from '../plugins/utils';

export function docStateToWriteDoc<RxDocType>(
    databaseInstanceToken: string,
    hasAttachments: boolean,
    docState: WithDeletedAndAttachments<RxDocType>,
    previous?: RxDocumentData<RxDocType>
): RxDocumentWriteData<RxDocType> {
    const docData: RxDocumentWriteData<RxDocType> = Object.assign(
        {},
        docState,
        {
            _attachments: hasAttachments && docState._attachments ? docState._attachments : {},
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
    writeDoc: RxDocumentData<RxDocType>,
    keepAttachments: boolean
): WithDeletedAndAttachments<RxDocType> {
    const ret = flatClone(writeDoc);

    if (!keepAttachments) {
        delete (ret as any)._attachments;
    }
    delete (ret as any)._meta;
    delete (ret as any)._rev;
    return ret;
}
