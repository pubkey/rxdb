import type { RxStorageInstanceMemory } from './rx-storage-instance-memory';

export function getMemoryCollectionKey(
    databaseName: string,
    collectionName: string
): string {
    return databaseName + '--memory--' + collectionName;
}


export function ensureNotRemoved(
    instance: RxStorageInstanceMemory<any>
) {
    if (instance.internals.removed) {
        throw new Error('removed');
    }
}
