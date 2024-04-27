import type {
    BulkWriteRow,
    RxDocumentData,
    RxDocumentWriteData,
    RxStorageInstance,
    RxStorageInstanceReplicationState,
    RxStorageReplicationMeta,
    WithDeletedAndAttachments
} from '../types/index.d.ts';
import {
    clone,
    createRevision,
    flatClone,
    getDefaultRevision,
    now
} from '../plugins/utils/index.ts';
import { stripAttachmentsDataFromDocument } from '../rx-storage-helper.ts';

export function docStateToWriteDoc<RxDocType>(
    databaseInstanceToken: string,
    hasAttachments: boolean,
    keepMeta: boolean,
    docState: WithDeletedAndAttachments<RxDocType>,
    previous?: RxDocumentData<RxDocType>
): RxDocumentWriteData<RxDocType> {
    const docData: RxDocumentWriteData<RxDocType> = Object.assign(
        {},
        docState,
        {
            _attachments: hasAttachments && docState._attachments ? docState._attachments : {},
            _meta: keepMeta ? (docState as any)._meta : Object.assign(
                {},
                previous ? previous._meta : {},
                {
                    lwt: now()
                }
            ),
            _rev: keepMeta ? (docState as any)._rev : getDefaultRevision()
        }
    );
    if (!docData._rev) {
        docData._rev = createRevision(
            databaseInstanceToken,
            previous
        );
    }

    return docData;
}

export function writeDocToDocState<RxDocType>(
    writeDoc: RxDocumentData<RxDocType>,
    keepAttachments: boolean,
    keepMeta: boolean
): WithDeletedAndAttachments<RxDocType> {
    const ret = flatClone(writeDoc);

    if (!keepAttachments) {
        delete (ret as any)._attachments;
    }
    if (!keepMeta) {
        delete (ret as any)._meta;
        delete (ret as any)._rev;
    }
    return ret;
}


export function stripAttachmentsDataFromMetaWriteRows<RxDocType>(
    state: RxStorageInstanceReplicationState<any>,
    rows: BulkWriteRow<RxStorageReplicationMeta<RxDocType, any>>[]
): BulkWriteRow<RxStorageReplicationMeta<RxDocType, any>>[] {
    if (!state.hasAttachments) {
        return rows;
    }
    return rows.map(row => {
        const document = clone(row.document);
        document.docData = stripAttachmentsDataFromDocument(document.docData);
        return {
            document,
            previous: row.previous
        };
    });
}

export function getUnderlyingPersistentStorage<RxDocType>(
    instance: RxStorageInstance<RxDocType, any, any, any>
): RxStorageInstance<RxDocType, any, any, any> {
    while (true) {
        if (instance.underlyingPersistentStorage) {
            instance = instance.underlyingPersistentStorage;
        } else {
            return instance;
        }
    }
}
