"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getLocalStorageMock = getLocalStorageMock;
var _rxStorageInstanceLocalstorage = require("./rx-storage-instance-localstorage.js");
/**
 * This mocks the localstorage API
 * so we can run tests in node.js
 */
var storage = {};
function getLocalStorageMock() {
  return {
    setItem: function (key, value) {
      storage[key] = value || '';
      _rxStorageInstanceLocalstorage.storageEventStream$.next({
        fromStorageEvent: true,
        key,
        newValue: value
      });
    },
    getItem: function (key) {
      return key in storage ? storage[key] : null;
    },
    removeItem: function (key) {
      delete storage[key];
    },
    get length() {
      return Object.keys(storage).length;
    },
    key: function (i) {
      var keys = Object.keys(storage);
      return keys[i] || null;
    }
  };
}
//# sourceMappingURL=localstorage-mock.js.map