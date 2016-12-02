'use strict';

//
// Class that should contain everything necessary to interact
// with localStorage as a generic key-value store.
// The idea is that authors who want to create an AbstractKeyValueDOWN
// module (e.g. on lawnchair, S3, whatever) will only have to
// reimplement this file.
//

// see http://stackoverflow.com/a/15349865/680742
var nextTick = global.setImmediate || process.nextTick;

// We use humble-localstorage as a wrapper for localStorage because
// it falls back to an in-memory implementation in environments without
// localStorage, like Node or Safari private browsing.
var storage = require('humble-localstorage');

function callbackify(callback, fun) {
  var val;
  var err;
  try {
    val = fun();
  } catch (e) {
    err = e;
  }
  nextTick(function () {
    callback(err, val);
  });
}

function createPrefix(dbname) {
  return dbname.replace(/!/g, '!!') + '!'; // escape bangs in dbname;
}

function LocalStorageCore(dbname) {
  this._prefix = createPrefix(dbname);
}

LocalStorageCore.prototype.getKeys = function (callback) {
  var self = this;
  callbackify(callback, function () {
    var keys = [];
    var prefixLen = self._prefix.length;
    var i = -1;
    var len = storage.length;
    while (++i < len) {
      var fullKey = storage.key(i);
      if (fullKey.substring(0, prefixLen) === self._prefix) {
        keys.push(fullKey.substring(prefixLen));
      }
    }
    keys.sort();
    return keys;
  });
};

LocalStorageCore.prototype.put = function (key, value, callback) {
  var self = this;
  callbackify(callback, function () {
    storage.setItem(self._prefix + key, value);
  });
};

LocalStorageCore.prototype.get = function (key, callback) {
  var self = this;
  callbackify(callback, function () {
    return storage.getItem(self._prefix + key);
  });
};

LocalStorageCore.prototype.remove = function (key, callback) {
  var self = this;
  callbackify(callback, function () {
    storage.removeItem(self._prefix + key);
  });
};

LocalStorageCore.destroy = function (dbname, callback) {
  var prefix = createPrefix(dbname);
  callbackify(callback, function () {
    var keysToDelete = [];
    var i = -1;
    var len = storage.length;
    while (++i < len) {
      var key = storage.key(i);
      if (key.substring(0, prefix.length) === prefix) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(function (key) {
      storage.removeItem(key);
    });
  });
};

module.exports = LocalStorageCore;