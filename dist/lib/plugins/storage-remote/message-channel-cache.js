"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MESSAGE_CHANNEL_CACHE_BY_IDENTIFIER = void 0;
exports.closeMessageChannel = closeMessageChannel;
exports.getMessageChannel = getMessageChannel;
var _utils = require("../utils");
var MESSAGE_CHANNEL_CACHE_BY_IDENTIFIER = new Map();
exports.MESSAGE_CHANNEL_CACHE_BY_IDENTIFIER = MESSAGE_CHANNEL_CACHE_BY_IDENTIFIER;
var CACHE_ITEM_BY_MESSAGE_CHANNEL = new WeakMap();
function getMessageChannelCache(identifier) {
  return (0, _utils.getFromMapOrCreate)(MESSAGE_CHANNEL_CACHE_BY_IDENTIFIER, identifier, () => new Map());
}
function getMessageChannel(settings, cacheKeys, keepAlive = false) {
  var cacheKey = getCacheKey(settings, cacheKeys);
  var cacheItem = (0, _utils.getFromMapOrCreate)(getMessageChannelCache(settings.identifier), cacheKey, () => {
    var newCacheItem = {
      identifier: settings.identifier,
      cacheKey,
      keepAlive,
      refCount: 1,
      messageChannel: settings.messageChannelCreator().then(messageChannel => {
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
function closeMessageChannel(messageChannel) {
  var cacheItem = (0, _utils.getFromMapOrThrow)(CACHE_ITEM_BY_MESSAGE_CHANNEL, messageChannel);
  cacheItem.refCount = cacheItem.refCount - 1;
  if (cacheItem.refCount === 0 && !cacheItem.keepAlive) {
    getMessageChannelCache(cacheItem.identifier).delete(cacheItem.cacheKey);
    return messageChannel.close();
  } else {
    return _utils.PROMISE_RESOLVE_VOID;
  }
}
function getCacheKey(settings, cacheKeys) {
  cacheKeys = cacheKeys.slice(0);
  cacheKeys.unshift(settings.identifier);
  return cacheKeys.join('||');
}
//# sourceMappingURL=message-channel-cache.js.map