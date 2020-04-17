/**
 * In this file we handle all accesses to the internal store of the database
 * This store is used to save hashes and checksums and metadata
 * ATM this only works with PouchDB but in the future
 * it should work by using the storage.interface
 */

import type {
    PouchDBInstance,
    RxDocumentTypeWithRev
} from './types';
import { LOCAL_PREFIX } from './util';

declare type RxStorageInstance = PouchDBInstance; // will be typed when we have more then one

export const INTERNAL_STORAGE_NAME = '_rxdb_internal';

/**
 * returns to local document with the given id
 * or null if not exists
 */
export function getLocalDocument(
    storageInstance: RxStorageInstance,
    id: string
): Promise<any | null> {
    return storageInstance.get(
        LOCAL_PREFIX + id
    ).catch(() => null);
}

export function setLocalDocument(
    storageInstance: RxStorageInstance,
    id: string,
    value: any
): Promise<void> {
    return storageInstance.put({
        _id: id,
        value
    }).then(() => { });
}


export function putDocument<DocData>(
    storageInstance: RxStorageInstance,
    doc: DocData | RxDocumentTypeWithRev<DocData>
): Promise<RxDocumentTypeWithRev<DocData>> {
    return storageInstance
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
    storageInstance: RxStorageInstance
): Promise<{
    id: string;
    key: string;
    value: any;
    doc: any;
}[]> {
    return storageInstance.allDocs({
        include_docs: true
    }).then(result => result.rows);
}

/**
 * deletes the storage instance and all of it's data
 */
export function deleteStorageInstance(
    storageInstance: RxStorageInstance
): Promise<void> {
    return storageInstance.destroy();
}
