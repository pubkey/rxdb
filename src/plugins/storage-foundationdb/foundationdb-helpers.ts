export function getFoundationDBIndexName(index: string[]): string {
    return index.join('|');
}
export const CLEANUP_INDEX: string[] = ['_deleted', '_meta.lwt'];

export const FOUNDATION_DB_WRITE_BATCH_SIZE = 2000;
