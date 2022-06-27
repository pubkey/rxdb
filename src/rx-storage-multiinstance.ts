/**
 * When a persistend RxStorage is used in more the one JavaScript process,
 * the even stream of the changestream() function must be broadcasted to the other
 * RxStorageInstances of the same databaseName+collectionName.
 * 
 * In the past this was done by RxDB but it makes more sense to do this
 * at the RxStorage level so that the broadcasting etc can all happen inside of a WebWorker
 * and not on the main thread.
 * Also it makes it less complex to stack up different RxStorages onto each other
 * like what we do with the in-memory plugin.
 * 
 * This is intened to be used inside of createStorageInstance() of a storage.
 * Do not use this if the storage anyway broadcasts the events like when using MongoDB
 * or in the future W3C might introduce a way to listen to IndexedDB changes.
 */

import { Observable, Subject } from 'rxjs';
import { mergeWith } from 'rxjs/operators';
import type {
    EventBulk,
    RxDocumentData,
    RxStorage,
    RxStorageChangeEvent,
    RxStorageInstance,
    RxStorageInstanceCreationParams
} from './types';

import {
    BroadcastChannel
} from 'broadcast-channel';

/**
 * The broadcast-channel is reused
 * for all RxStorageInstances of the same RxStorage.
 * This ensures that when more then one RxDatabase is created, we still only have one BroadcastChannel.
 * Also it makes it still possible to simulate multi-instance usage in the unit tests
 * where we can just use two different RxStorage objects so that the BroadcastChannels do not mix up.
 */
export const BROADCAST_CHANNEL_BY_STORAGE: Map<RxStorage<any, any>, {
    bc: BroadcastChannel<RxStorageMultiInstanceBroadcastType>;
    refs: number;
    storage: RxStorage<any, any>;
}> = new Map();


export type RxStorageMultiInstanceBroadcastType = {
    storageName: string;
    collectionName: string;
    databaseName: string;
    eventBulk: EventBulk<any>;
}

export function getBroadcastChannelReference(
    storage: RxStorage<any, any>
): BroadcastChannel<RxStorageMultiInstanceBroadcastType> {
    let state = BROADCAST_CHANNEL_BY_STORAGE.get(storage);
    if (!state) {
        state = {
            bc: new BroadcastChannel('RxDB:' + storage.name),
            refs: 1,
            storage
        };
        BROADCAST_CHANNEL_BY_STORAGE.set(storage, state);
    } else {
        state.refs = state.refs + 1;
    }
    return state.bc;
}

export async function removeBroadcastChannelReference(
    storage: RxStorage<any, any>
) {
    const state = BROADCAST_CHANNEL_BY_STORAGE.get(storage);
    if (!state) {
        return;
    }
    state.refs = state.refs - 1;
    if (state.refs === 0) {
        console.log('refs === 0');
        BROADCAST_CHANNEL_BY_STORAGE.delete(storage);
        return state.bc.close();
    }
}


export function addRxStorageMultiInstanceSupport<RxDocType>(
    instanceCreationParams: RxStorageInstanceCreationParams<RxDocType, any>,
    instance: RxStorageInstance<RxDocType, any, any>,
    /**
     * If provided, that channel will be used
     * instead of an own one.
     */
    providedBroadcastChannel?: BroadcastChannel<any>
) {
    if (!instanceCreationParams.multiInstance) {
        return;
    }

    const storage = instance.storage;

    type Emit = EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>>;


    const broadcastChannel = providedBroadcastChannel ? providedBroadcastChannel : getBroadcastChannelReference(storage);
    const changesFromOtherInstances$: Subject<Emit> = new Subject();


    const eventListener = (msg: RxStorageMultiInstanceBroadcastType) => {
        if (
            msg.storageName === storage.name &&
            msg.databaseName === instanceCreationParams.databaseName &&
            msg.collectionName === instanceCreationParams.collectionName
        ) {
            changesFromOtherInstances$.next(msg.eventBulk);
        }
    };
    broadcastChannel.addEventListener('message', eventListener);

    const oldChangestream$ = instance.changeStream();

    let closed = false;
    const sub = oldChangestream$.subscribe(eventBulk => {
        if (closed) {
            return;
        }
        broadcastChannel.postMessage({
            storageName: storage.name,
            databaseName: instanceCreationParams.databaseName,
            collectionName: instanceCreationParams.collectionName,
            eventBulk
        });
    });

    instance.changeStream = function (): Observable<Emit> {
        return changesFromOtherInstances$.asObservable().pipe(
            mergeWith(oldChangestream$)
        );
    }

    const oldClose = instance.close.bind(instance);

    instance.close = async function () {
        sub.unsubscribe();
        closed = true;
        broadcastChannel.removeEventListener('message', eventListener);
        if (!providedBroadcastChannel) {
            await removeBroadcastChannelReference(storage);
        }
        return oldClose();
    }
}
