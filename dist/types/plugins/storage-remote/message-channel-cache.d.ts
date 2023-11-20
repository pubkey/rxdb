import { RemoteMessageChannel, RxStorageRemoteSettings } from './storage-remote-types.ts';
export type RemoteMessageChannelCacheItem = {
    identifier: string;
    cacheKey: string;
    messageChannel: Promise<RemoteMessageChannel>;
    refCount: number;
    keepAlive: boolean;
};
export declare const MESSAGE_CHANNEL_CACHE_BY_IDENTIFIER: Map<string, Map<string, RemoteMessageChannelCacheItem>>;
export declare const CACHE_ITEM_BY_MESSAGE_CHANNEL: WeakMap<RemoteMessageChannel, RemoteMessageChannelCacheItem>;
export declare const OPEN_REMOTE_MESSAGE_CHANNELS: Set<RemoteMessageChannel>;
export declare function getMessageChannel(settings: RxStorageRemoteSettings, cacheKeys: string[], keepAlive?: boolean): Promise<RemoteMessageChannel>;
export declare function closeMessageChannel(messageChannel: RemoteMessageChannel): Promise<void>;
