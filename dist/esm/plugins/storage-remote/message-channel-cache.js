import { PROMISE_RESOLVE_VOID, getFromMapOrCreate, getFromMapOrThrow } from "../utils/index.js";
export var MESSAGE_CHANNEL_CACHE_BY_IDENTIFIER = new Map();
export var CACHE_ITEM_BY_MESSAGE_CHANNEL = new WeakMap();
export var OPEN_REMOTE_MESSAGE_CHANNELS = new Set();
function getMessageChannelCache(identifier) {
  return getFromMapOrCreate(MESSAGE_CHANNEL_CACHE_BY_IDENTIFIER, identifier, () => new Map());
}
export function getMessageChannel(settings, cacheKeys, keepAlive = false) {
  var cacheKey = getCacheKey(settings, cacheKeys);
  var cacheItem = getFromMapOrCreate(getMessageChannelCache(settings.identifier), cacheKey, () => {
    var newCacheItem = {
      identifier: settings.identifier,
      cacheKey,
      keepAlive,
      refCount: 1,
      messageChannel: settings.messageChannelCreator().then(messageChannel => {
        OPEN_REMOTE_MESSAGE_CHANNELS.add(messageChannel);
        CACHE_ITEM_BY_MESSAGE_CHANNEL.set(messageChannel, newCacheItem);
        return messageChannel;
      })
    };
    return newCacheItem;
  }, existingCacheItem => {
    existingCacheItem.refCount = existingCacheItem.refCount + 1;
  });
  return cacheItem.messageChannel;
}
export function closeMessageChannel(messageChannel) {
  var cacheItem = getFromMapOrThrow(CACHE_ITEM_BY_MESSAGE_CHANNEL, messageChannel);
  cacheItem.refCount = cacheItem.refCount - 1;
  if (cacheItem.refCount === 0 && !cacheItem.keepAlive) {
    getMessageChannelCache(cacheItem.identifier).delete(cacheItem.cacheKey);
    OPEN_REMOTE_MESSAGE_CHANNELS.delete(messageChannel);
    return messageChannel.close();
  } else {
    return PROMISE_RESOLVE_VOID;
  }
}
function getCacheKey(settings, cacheKeys) {
  cacheKeys = cacheKeys.slice(0);
  cacheKeys.unshift(settings.identifier);
  return cacheKeys.join('||');
}
//# sourceMappingURL=message-channel-cache.js.map