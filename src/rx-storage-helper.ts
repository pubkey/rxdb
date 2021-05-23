/**
 * Helper functions for accessing the RxStorage instances.
 */

import { RxStorageInstancePouch } from './rx-storage-pouchdb';
import { RxStorageInstance } from './rx-storage.interface';
import { WithRevision, WithWriteRevision } from './types';

export const INTERNAL_STORAGE_NAME = '_rxdb_internal';

/**
 * returns all NON-LOCAL documents
 */
export function getAllDocuments<RxDocType>(
    storageInstance: RxStorageInstancePouch<RxDocType>
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
 * Writes a single document,
 * throws RxStorageBulkWriteError on failure
 */
export async function writeSingle<RxDocType>(
    instance: RxStorageInstance<RxDocType, any, any>,
    overwrite: boolean,
    document: WithWriteRevision<RxDocType>
): Promise<WithRevision<RxDocType>> {
    const writeResult = await instance.bulkWrite(
        overwrite,
        [document]
    );

        console.log('write result:');
        console.dir(writeResult);

    if (writeResult.error.size > 0) {
        const error = writeResult.error.values().next().value;
        throw error;
    } else {
        const ret = writeResult.success.values().next().value;
        console.log('Ret:');
        console.dir(ret);
        return ret;
    }
}
