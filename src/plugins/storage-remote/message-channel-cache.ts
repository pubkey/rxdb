import {
    PROMISE_RESOLVE_VOID,
    getFromMapOrCreate,
    getFromMapOrThrow
} from '../utils/index.ts';
import {
    RemoteMessageChannel,
    RxStorageRemoteSettings
} from './storage-remote-types.ts';

export type RemoteMessageChannelCacheItem = {
    identifier: string;
    cacheKey: string;
    messageChannel: Promise<RemoteMessageChannel>;
    refCount: number;
    keepAlive: boolean;
};

export const MESSAGE_CHANNEL_CACHE_BY_IDENTIFIER = new Map<string, Map<string, RemoteMessageChannelCacheItem>>();
export const CACHE_ITEM_BY_MESSAGE_CHANNEL = new WeakMap<RemoteMessageChannel, RemoteMessageChannelCacheItem>();


export const OPEN_REMOTE_MESSAGE_CHANNELS = new Set<RemoteMessageChannel>();

function getMessageChannelCache(
    identifier: string
) {
    return getFromMapOrCreate(
        MESSAGE_CHANNEL_CACHE_BY_IDENTIFIER,
        identifier,
        () => new Map()
    );
}

export function getMessageChannel(
    settings: RxStorageRemoteSettings,
    cacheKeys: string[],
    keepAlive: boolean = false
): Promise<RemoteMessageChannel> {
    const cacheKey = getCacheKey(settings, cacheKeys);
    const cacheItem = getFromMapOrCreate(
        getMessageChannelCache(settings.identifier),
        cacheKey,
        () => {
            const newCacheItem: RemoteMessageChannelCacheItem = {
                identifier: settings.identifier,
                cacheKey,
                keepAlive,
                refCount: 1,
                messageChannel: settings.messageChannelCreator()
                    .then((messageChannel) => {
                        OPEN_REMOTE_MESSAGE_CHANNELS.add(messageChannel);
                        CACHE_ITEM_BY_MESSAGE_CHANNEL.set(messageChannel, newCacheItem);
                        return messageChannel;
                    }),
            };
            return newCacheItem;
        },
        (existingCacheItem) => {
            existingCacheItem.refCount = existingCacheItem.refCount + 1;
        }
    );
    return cacheItem.messageChannel;
}


export function closeMessageChannel(
    messageChannel: RemoteMessageChannel
): Promise<void> {
    const cacheItem = getFromMapOrThrow(CACHE_ITEM_BY_MESSAGE_CHANNEL, messageChannel);
    cacheItem.refCount = cacheItem.refCount - 1;
    if (cacheItem.refCount === 0 && !cacheItem.keepAlive) {
        getMessageChannelCache(cacheItem.identifier).delete(cacheItem.cacheKey);
        OPEN_REMOTE_MESSAGE_CHANNELS.delete(messageChannel);
        return messageChannel.close();
    } else {
        return PROMISE_RESOLVE_VOID;
    }
}

function getCacheKey(
    settings: RxStorageRemoteSettings,
    cacheKeys: string[]
): string {
    cacheKeys = cacheKeys.slice(0);
    cacheKeys.unshift(settings.identifier);
    return cacheKeys.join('||');
}
