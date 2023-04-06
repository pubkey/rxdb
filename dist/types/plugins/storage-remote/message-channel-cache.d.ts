import { RemoteMessageChannel, RxStorageRemoteSettings } from './storage-remote-types';
export type RemoteMessageChannelCacheItem = {
    identifier: string;
    cacheKey: string;
    messageChannel: Promise<RemoteMessageChannel>;
    refCount: number;
};
export declare const MESSAGE_CHANNEL_CACHE_BY_IDENTIFIER: Map<string, Map<string, RemoteMessageChannelCacheItem>>;
export declare function getMessageChannel(settings: RxStorageRemoteSettings, cacheKeys: string[]): Promise<RemoteMessageChannel>;
export declare function closeMessageChannel(messageChannel: RemoteMessageChannel): Promise<void>;
