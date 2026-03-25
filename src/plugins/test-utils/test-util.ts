import type { Func } from 'mocha';
import assert from 'assert';
import type { RxCollection } from '../../types';
import { promiseWait, requestIdlePromise } from '../utils/index.ts';
import type { RxReplicationState } from '../replication/index.ts';

export function testMultipleTimes(times: number, title: string, test: Func) {
    new Array(times).fill(0).forEach(() => {
        it(title, test);
    });
}

export async function ensureCollectionsHaveEqualState<RxDocType>(
    c1: RxCollection<RxDocType>,
    c2: RxCollection<RxDocType>,
    logContext?: string
) {
    await requestIdlePromise();
    const getJson = async (collection: RxCollection<RxDocType>) => {
        const docs = await collection.find().exec();
        return docs.map(d => d.toJSON());
    };
    const json1 = await getJson(c1);
    const json2 = await getJson(c2);
    try {
        assert.deepStrictEqual(
            json1,
            json2
        );
    } catch (err) {
        console.error('ensureCollectionsHaveEqualState(' + logContext + ') states not equal (c1:' + c1.name + ', c2:' + c2.name + '):');
        console.dir({
            c1: json1,
            c2: json2
        });
        console.log('----------');
        throw err;
    }
}

/**
 * Waits until the collections have the equal state.
 */
export async function awaitCollectionsHaveEqualState<RxDocType>(
    c1: RxCollection<RxDocType>,
    c2: RxCollection<RxDocType>,
    logContext?: string,
    timeout = 8000
) {
    let i = 0;
    const startTime = Date.now();
    while (true) {
        i++;
        try {
            await ensureCollectionsHaveEqualState(
                c1,
                c2,
                logContext
            );
            return;
        } catch (err) {
            if ((Date.now() - startTime) > timeout) {
                throw err;
            } else {
                await promiseWait(50 * i);
            }
        }
    }
}



/**
 * Deletes all locally stored IndexedDB databases.
 * Noop if IndexedDB is not available (e.g. in Node.js)
 * or if the .databases() method is not supported.
 */
export async function clearAllLocalIndexedDB(): Promise<void> {
    if (
        typeof indexedDB === 'undefined' ||
        typeof indexedDB.databases !== 'function'
    ) {
        return;
    }
    const databases = await indexedDB.databases();
    await Promise.all(
        databases
            .filter(db => !!db.name)
            .map(db => {
                return new Promise<void>((resolve, reject) => {
                    const req = indexedDB.deleteDatabase(db.name as string);
                    req.onsuccess = () => resolve();
                    req.onerror = () => reject(req.error);
                });
            })
    );
}

/**
 * Deletes all files and directories stored in the
 * Origin Private File System (OPFS).
 * Noop if OPFS is not available (e.g. in Node.js).
 */
export async function clearAllLocalOPFS(maxRetries = 20, delayMs = 200): Promise<void> {
    if (
        typeof navigator === 'undefined' ||
        !navigator.storage ||
        typeof navigator.storage.getDirectory !== 'function'
    ) {
        return;
    }
    const root = await navigator.storage.getDirectory();
    // @ts-ignore entries() is not in all TS lib definitions
    for await (const [name] of root.entries()) {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                await root.removeEntry(name, { recursive: true });
                break;
            } catch (err: any) {
                if (err?.name === 'NoModificationAllowedError' && attempt < maxRetries - 1) {
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                } else {
                    throw err;
                }
            }
        }
    }
}

/**
 * Clears all localStorage data.
 * Noop if localStorage is not available (e.g. in Node.js).
 */
export async function clearAllLocalStorage(): Promise<void> {
    if (
        typeof localStorage === 'undefined' ||
        typeof localStorage.clear !== 'function'
    ) {
        return;
    }
    localStorage.clear();
}

export function ensureReplicationHasNoErrors(replicationState: RxReplicationState<any, any>) {
    /**
     * We do not have to unsubscribe because the observable will cancel anyway.
     */
    replicationState.error$.subscribe((err: any) => {
        console.error('ensureReplicationHasNoErrors() has error:');
        console.log(err);
        if (err?.parameters?.errors) {
            throw err.parameters.errors[0];
        }
        throw err;
    });
}
