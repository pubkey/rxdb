import type { RxDocumentData, WithDeleted, WithDeletedAndAttachments } from '../../types';
import { flatClone } from '../utils/index.ts';

export function appwriteDocToRxDB<RxDocType>(
    appwriteDoc: any,
    primaryKey: string,
    deletedField: string

): WithDeleted<RxDocType> {
    const useDoc: any = {};
    Object.keys(appwriteDoc).forEach(key => {
        if (!key.startsWith('$')) {
            useDoc[key] = appwriteDoc[key];
        }
    });
    useDoc[primaryKey] = appwriteDoc.$id;
    useDoc._deleted = appwriteDoc[deletedField];
    if (deletedField !== '_deleted') {
        delete useDoc[deletedField];
    }
    return useDoc;
}


export function rxdbDocToAppwrite<RxDocType>(
    rxdbDoc: WithDeletedAndAttachments<RxDocType>,
    primaryKey: string,
    deletedField: string
) {
    const writeDoc: any = flatClone(rxdbDoc);
    delete (writeDoc as WithDeletedAndAttachments<RxDocType>)._attachments;
    delete writeDoc[primaryKey];
    writeDoc[deletedField] = writeDoc._deleted;
    if (deletedField !== '_deleted') {
        delete writeDoc._deleted;
    }
    return writeDoc;
}
