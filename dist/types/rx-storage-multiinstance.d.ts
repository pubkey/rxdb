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
import type { EventBulk, RxStorageInstance, RxStorageInstanceCreationParams } from './types/index.d.ts';
import { BroadcastChannel } from 'broadcast-channel';
/**
 * The broadcast-channel is reused by the databaseInstanceToken.
 * This is required so that it is easy to simulate multi-tab usage
 * in the test where different instances of the same RxDatabase must
 * have different broadcast channels.
 * But also it ensures that for each RxDatabase we only create a single
 * broadcast channel that can even be reused in the leader election plugin.
 */
export declare const BROADCAST_CHANNEL_BY_TOKEN: Map<string, {
    bc: BroadcastChannel<RxStorageMultiInstanceBroadcastType>;
    /**
     * Contains all context objects that currently use the channel.
     * If this becomes empty, we can close the channel
     */
    refs: Set<any>;
}>;
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
export declare function getBroadcastChannelReference(storageName: string, databaseInstanceToken: string, databaseName: string, refObject: any): BroadcastChannel<RxStorageMultiInstanceBroadcastType>;
export declare function removeBroadcastChannelReference(databaseInstanceToken: string, refObject: any): Promise<void> | undefined;
export declare function addRxStorageMultiInstanceSupport<RxDocType>(storageName: string, instanceCreationParams: RxStorageInstanceCreationParams<RxDocType, any>, instance: RxStorageInstance<RxDocType, any, any>, 
/**
 * If provided, that channel will be used
 * instead of an own one.
 */
providedBroadcastChannel?: BroadcastChannel<any>): void;
