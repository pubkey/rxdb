export function getFoundationDBIndexName(index: string[]): string {
    return index.join('|');
}
export const CLEANUP_INDEX: string[] = ['_deleted', '_meta.lwt'];
