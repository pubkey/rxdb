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
    RxStorageChangeEvent,
    RxStorageInstance,
    RxStorageInstanceCreationParams
} from './types';

import {
    BroadcastChannel
} from 'broadcast-channel';

/**
 * The broadcast-channel is reused by the databaseInstanceToken.
 * This is required so that it is easy to simulate multi-tab usage
 * in the test where different instances of the same RxDatabase must
 * have different broadcast channels.
 * But also it ensures that for each RxDatabase we only create a single
 * broadcast channel that can even be reused in the leader election plugin.
 * 
 * TODO at the end of the unit tests,
 * we should ensure that all channels are closed and cleaned up.
 * Otherwise we have forgot something.
 */
export const BROADCAST_CHANNEL_BY_TOKEN: Map<string, {
    bc: BroadcastChannel<RxStorageMultiInstanceBroadcastType>;
    refs: number;
}> = new Map();


export type RxStorageMultiInstanceBroadcastType = {
    storageName: string;
    collectionName: string;
    databaseName: string;
    eventBulk: EventBulk<any>;
}

export function getBroadcastChannelReference(
    databaseInstanceToken: string,
    databaseName: string
): BroadcastChannel<RxStorageMultiInstanceBroadcastType> {
    let state = BROADCAST_CHANNEL_BY_TOKEN.get(databaseInstanceToken);
    if (!state) {
        state = {
            /**
             * We have to use the databaseName instead of the databaseInstanceToken
             * in the BroadcastChannel name because different instances must end with the same
             * channel name to be able to broadcast messages between each other.
             */
            bc: new BroadcastChannel('RxDB:' + databaseName),
            refs: 1
        };
        BROADCAST_CHANNEL_BY_TOKEN.set(databaseInstanceToken, state);
    } else {
        state.refs = state.refs + 1;
    }
    return state.bc;
}

export async function removeBroadcastChannelReference(
    databaseInstanceToken: string
) {
    const state = BROADCAST_CHANNEL_BY_TOKEN.get(databaseInstanceToken);
    if (!state) {
        return;
    }
    state.refs = state.refs - 1;
    if (state.refs === 0) {
        console.log('refs === 0');
        BROADCAST_CHANNEL_BY_TOKEN.delete(databaseInstanceToken);
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


    const broadcastChannel = providedBroadcastChannel ?
        providedBroadcastChannel :
        getBroadcastChannelReference(
            instanceCreationParams.databaseInstanceToken,
            instance.databaseName
        );
    const changesFromOtherInstances$: Subject<Emit> = new Subject();


    const eventListener = (msg: RxStorageMultiInstanceBroadcastType) => {
        if (
            msg.storageName === storage.name &&
            msg.databaseName === instanceCreationParams.databaseName &&
            msg.collectionName === instanceCreationParams.collectionName
        ) {
            console.log('event listenert:');
            console.dir(msg);
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
        console.log('post message:');
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
        closed = true;
        sub.unsubscribe();
        broadcastChannel.removeEventListener('message', eventListener);
        if (!providedBroadcastChannel) {
            await removeBroadcastChannelReference(instanceCreationParams.databaseInstanceToken);
        }
        return oldClose();
    }

    const oldRemove = instance.remove.bind(instance);
    instance.remove = async function () {
        closed = true;
        return oldRemove();
    }
}
