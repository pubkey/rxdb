/**
 * When a persistent RxStorage is used in more the one JavaScript process,
 * the even stream of the changestream() function must be broadcasted to the other
 * RxStorageInstances of the same databaseName+collectionName.
 *
 * In the past this was done by RxDB but it makes more sense to do this
 * at the RxStorage level so that the broadcasting etc can all happen inside of a WebWorker
 * and not on the main thread.
 * Also it makes it less complex to stack up different RxStorages onto each other
 * like what we do with the in-memory plugin.
 *
 * This is intended to be used inside of createStorageInstance() of a storage.
 * Do not use this if the storage anyway broadcasts the events like when using MongoDB
 * or in the future W3C might introduce a way to listen to IndexedDB changes.
 */

import { Observable, Subject } from 'rxjs';
import { mergeWith } from 'rxjs/operators';
import type {
    EventBulk,
    RxStorageChangeEvent,
    RxStorageInstance,
    RxStorageInstanceCreationParams
} from './types/index.d.ts';

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
 */
export const BROADCAST_CHANNEL_BY_TOKEN: Map<string, {
    bc: BroadcastChannel<RxStorageMultiInstanceBroadcastType>;
    /**
     * Contains all context objects that currently use the channel.
     * If this becomes empty, we can close the channel
     */
    refs: Set<any>;
}> = new Map();


export type RxStorageMultiInstanceBroadcastType = {
    storageName: string;
    collectionName: string;
    /**
     * collection.schema.version
     */
    version: number;
    databaseName: string;
    eventBulk: EventBulk<any, any>;
};

export function getBroadcastChannelReference(
    storageName: string,
    databaseInstanceToken: string,
    databaseName: string,
    refObject: any
): BroadcastChannel<RxStorageMultiInstanceBroadcastType> {
    let state = BROADCAST_CHANNEL_BY_TOKEN.get(databaseInstanceToken);
    if (!state) {
        state = {
            /**
             * We have to use the databaseName instead of the databaseInstanceToken
             * in the BroadcastChannel name because different instances must end with the same
             * channel name to be able to broadcast messages between each other.
             */
            bc: new BroadcastChannel(['RxDB:', storageName, databaseName].join('|')),
            refs: new Set<any>()
        };
        BROADCAST_CHANNEL_BY_TOKEN.set(databaseInstanceToken, state);
    }
    state.refs.add(refObject);
    return state.bc;
}

export function removeBroadcastChannelReference(
    databaseInstanceToken: string,
    refObject: any
) {
    const state = BROADCAST_CHANNEL_BY_TOKEN.get(databaseInstanceToken);
    if (!state) {
        return;
    }
    state.refs.delete(refObject);
    if (state.refs.size === 0) {
        BROADCAST_CHANNEL_BY_TOKEN.delete(databaseInstanceToken);
        return state.bc.close();
    }
}


export function addRxStorageMultiInstanceSupport<RxDocType>(
    storageName: string,
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

    type Emit = EventBulk<RxStorageChangeEvent<RxDocType>, any>;

    const broadcastChannel = providedBroadcastChannel ?
        providedBroadcastChannel :
        getBroadcastChannelReference(
            storageName,
            instanceCreationParams.databaseInstanceToken,
            instance.databaseName,
            instance
        );

    const changesFromOtherInstances$: Subject<Emit> = new Subject();


    const eventListener = (msg: RxStorageMultiInstanceBroadcastType) => {
        if (
            msg.storageName === storageName &&
            msg.databaseName === instanceCreationParams.databaseName &&
            msg.collectionName === instanceCreationParams.collectionName &&
            msg.version === instanceCreationParams.schema.version
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
            storageName: storageName,
            databaseName: instanceCreationParams.databaseName,
            collectionName: instanceCreationParams.collectionName,
            version: instanceCreationParams.schema.version,
            eventBulk
        });
    });

    instance.changeStream = function (): Observable<Emit> {
        return changesFromOtherInstances$.asObservable().pipe(
            mergeWith(oldChangestream$)
        );
    };

    const oldClose = instance.close.bind(instance);
    instance.close = async function () {
        closed = true;
        sub.unsubscribe();
        broadcastChannel.removeEventListener('message', eventListener);
        if (!providedBroadcastChannel) {
            await removeBroadcastChannelReference(
                instanceCreationParams.databaseInstanceToken,
                instance
            );
        }
        return oldClose();
    };

    const oldRemove = instance.remove.bind(instance);
    instance.remove = async function () {
        closed = true;
        sub.unsubscribe();
        broadcastChannel.removeEventListener('message', eventListener);
        if (!providedBroadcastChannel) {
            await removeBroadcastChannelReference(
                instanceCreationParams.databaseInstanceToken,
                instance
            );
        }
        return oldRemove();
    };
}
