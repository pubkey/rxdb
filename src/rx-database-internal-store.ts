/**
 * In this file we handle all accesses to the internal store of the database
 * This store is used to save hashes and checksums and metadata
 * ATM this only works with PouchDB but in the future
 * it should work by using the storage.interface
 */

import { POUCHDB_LOCAL_PREFIX, RxStorageInstancePouch } from './rx-storage-pouchdb';
import type {
    RxDocumentTypeWithRev
} from './types';

export const INTERNAL_STORAGE_NAME = '_rxdb_internal';

/**
 * returns to local document with the given id
 * or null if not exists
 */
export function getLocalDocument(
    storageInstance: RxStorageInstancePouch,
    id: string
): Promise<any | null> {
    return storageInstance.internals.pouch.get(
        POUCHDB_LOCAL_PREFIX + id
    ).catch(() => null);
}

export function setLocalDocument(
    storageInstance: RxStorageInstancePouch,
    id: string,
    value: any
): Promise<void> {
    return storageInstance.internals.pouch.put({
        _id: id,
        value
    }).then(() => { });
}


export function putDocument<DocData>(
    storageInstance: RxStorageInstancePouch,
    doc: DocData | RxDocumentTypeWithRev<DocData>
): Promise<RxDocumentTypeWithRev<DocData>> {
    return storageInstance.internals.pouch
        .put(doc)
        .then(putResult => {
            return Object.assign({
                _id: putResult.id,
                _rev: putResult.rev
            }, doc);
        });
}

/**
 * returns all NON-LOCAL documents
 */
export function getAllDocuments(
    storageInstance: RxStorageInstancePouch
): Promise<{
    id: string;
    key: string;
    value: any;
    doc: any;
}[]> {
    return storageInstance.internals.pouch.allDocs({
        include_docs: true
    }).then(result => result.rows);
}

/**
 * deletes the storage instance and all of it's data
 * TODO must be imlemented in RxStorageInstnace
 */
export function deleteStorageInstance(
    storageInstance: RxStorageInstancePouch
): Promise<void> {
    return storageInstance.internals.pouch.destroy();
}
