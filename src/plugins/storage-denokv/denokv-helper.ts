export const RX_STORAGE_NAME_DENOKV = 'denokv';

export function getDenoKVIndexName(index: string[]): string {
    return index.join('|');
}

/**
 * Used for non-index rows that contain the document data,
 * not just a documentId
 */
export const DENOKV_DOCUMENT_ROOT_PATH = '||';

export const CLEANUP_INDEX: string[] = ['_deleted', '_meta.lwt'];


/**
 * Get the global Deno variable from globalThis.Deno
 * so that compiling with plain typescript does not fail.
 * Deno has no way to just "download" the deno typings,
 * so we have to use the "any" type here.
 */
export function getDenoGlobal(): any {
    return (globalThis as any).Deno;
}


export async function commitWithRetry(buildTx: () => any) {
    let attempt = 0;

    while (true) {
        const tx = buildTx();
        try {
            return await tx.commit();
        } catch (err) {
            const locked = err && String((err as any).message).includes('database is locked');
            if (locked && attempt < 3) {
                attempt++;
                await new Promise(res => setTimeout(res, 5 * attempt));
                continue;
            }
            throw err;
        }
    }
}
