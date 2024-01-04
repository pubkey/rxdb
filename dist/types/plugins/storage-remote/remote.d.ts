import type { RxStorageRemoteExposeSettings, RxStorageRemoteExposeType } from './storage-remote-types.ts';
/**
 * Run this on the 'remote' part,
 * so that RxStorageMessageChannel can connect to it.
 */
export declare function exposeRxStorageRemote(settings: RxStorageRemoteExposeSettings): RxStorageRemoteExposeType;
