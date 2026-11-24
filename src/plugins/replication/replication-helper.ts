import type {
    MaybePromise,
    RxCollection,
    WithDeleted
} from '../../types/index.d.ts';
import { flatClone, PROMISE_RESOLVE_VOID } from '../../plugins/utils/index.ts';
import { getComposedPrimaryKeyOfDocumentData } from '../../rx-schema-helper.ts';
import type { RxReplicationState } from './index.ts';

// does nothing
export const DEFAULT_MODIFIER = (d: any) => Promise.resolve(d);


export function swapDefaultDeletedTodeletedField<RxDocType>(
    deletedField: string,
    doc: WithDeleted<RxDocType>
): RxDocType {
    if (deletedField === '_deleted') {
        return doc;
    } else {
        doc = flatClone(doc);
        const isDeleted = !!doc._deleted;
        (doc as any)[deletedField] = isDeleted;
        delete (doc as any)._deleted;
        return doc;
    }
}

/**
 * Must be run over all plain document data
 * that was pulled from the remote.
 * Used to fill up fields or modify the deleted field etc.
 */
export function handlePulledDocuments<RxDocType>(
    collection: RxCollection<RxDocType, unknown, unknown, unknown>,
    deletedField: string,
    docs: RxDocType[]
): WithDeleted<RxDocType>[] {
    return docs.map(doc => {
        const useDoc: WithDeleted<RxDocType> = flatClone(doc) as any;

        /**
         * Swap out the deleted field
         */
        if (deletedField !== '_deleted') {
            const isDeleted = !!(useDoc as any)[deletedField];
            (useDoc as any)._deleted = isDeleted;
            delete (useDoc as any)[deletedField];
        } else {
            // ensure we have a boolean.
            useDoc._deleted = !!useDoc._deleted;
        }

        /**
         * Fill up composed primary
         */
        const primaryPath = collection.schema.primaryPath;
        (useDoc as any)[primaryPath] = getComposedPrimaryKeyOfDocumentData(
            collection.schema.jsonSchema,
            useDoc
        );
        return useDoc as any;
    });
}


/**
 * Like normal promiseWait()
 * but will skip the wait time if the online-state changes.
 */
export function awaitRetry(
    collection: RxCollection<any, any, any>,
    retryTime: number
) {
    if (
        typeof window === 'undefined' ||
        typeof window !== 'object' ||
        typeof window.addEventListener === 'undefined' ||
        navigator.onLine
    ) {
        return collection.promiseWait(retryTime);
    }

    let listener: any;
    const onlineAgain = new Promise<void>(res => {
        listener = () => {
            window.removeEventListener('online', listener);
            res();
        };
        window.addEventListener('online', listener);
    });

    return Promise.race([
        onlineAgain,
        collection.promiseWait(retryTime)
    ]).then(() => {
        window.removeEventListener('online', listener);
    });
}


/**
 * When a replication is running and the leading tab get hibernated
 * by the browser, the replication will be stuck.
 * To prevent this, we fire a mouseeven each X seconds while the replication is not canceled.
 * 
 * If you find a better way to prevent hibernation, please make a pull request.
 */
export function preventHibernateBrowserTab(replicationState: RxReplicationState<any, any>) {
    function simulateActivity() {
        if (
            typeof document === 'undefined' ||
            typeof document.dispatchEvent !== 'function'
        ) {
            return;
        }
        const event = new Event('mousemove');
        document.dispatchEvent(event);
    }

    const intervalId = setInterval(simulateActivity, 20 * 1000); // Simulate activity every 20 seconds
    replicationState.onCancel.push(() => clearInterval(intervalId));
}


/**
 * start(), pause(), and cancel() can be called without awaiting the call before,
 * so the stream is opened and closed in a queue to never have two open streams.
 */
export function openStreamWhileStarted(
    replicationState: RxReplicationState<any, any>,
    openStream: () => MaybePromise<() => any>
) {
    const startBefore = replicationState.start.bind(replicationState);
    const pauseBefore = replicationState.pause.bind(replicationState);
    const cancelBefore = replicationState.cancel.bind(replicationState);
    let closeStream: (() => any) | undefined;
    let streamWanted = false;
    let canceled = false;
    let pendingStarts = 0;
    let queue: Promise<any> = PROMISE_RESOLVE_VOID;
    function updateStream(): Promise<void> {
        const ret = queue.then(async () => {
            if (streamWanted && !closeStream) {
                closeStream = await openStream();
            } else if (!streamWanted && closeStream) {
                const closeFn = closeStream;
                closeStream = undefined;
                await closeFn();
            }
        });
        queue = ret.catch(() => { });
        return ret;
    }
    function stop<T>(baseFn: () => Promise<T>): Promise<T> {
        streamWanted = false;
        const ret = baseFn();
        const closed = updateStream().catch(() => { });
        return pendingStarts > 0 ? ret : Promise.all([ret, closed]).then(r => r[0]);
    }
    replicationState.start = async () => {
        if (replicationState.isStopped()) {
            return startBefore();
        }
        if (canceled) {
            return;
        }
        streamWanted = true;
        pendingStarts = pendingStarts + 1;
        try {
            await updateStream();
        } catch (err) {
            if (streamWanted) {
                throw err;
            }
        } finally {
            pendingStarts = pendingStarts - 1;
        }
        if (streamWanted) {
            return startBefore();
        }
    };
    replicationState.pause = () => stop(pauseBefore);
    replicationState.cancel = () => {
        canceled = true;
        return stop(cancelBefore);
    };
}
