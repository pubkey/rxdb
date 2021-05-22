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
