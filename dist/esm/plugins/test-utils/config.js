/// <reference path="../../../node_modules/@types/mocha/index.d.ts" />
import { ensureNotFalsy, isPromise, randomToken } from "../utils/index.js";
import { enforceOptions as broadcastChannelEnforceOptions } from 'broadcast-channel';
import events from 'node:events';
import { wrappedKeyEncryptionCryptoJsStorage } from "../encryption-crypto-js/index.js";
export var isDeno = typeof Deno !== 'undefined' || typeof window !== 'undefined' && 'Deno' in window;
export var isBun = typeof process !== 'undefined' && !!process.versions.bun;
export var isNode = !isDeno && !isBun && typeof window === 'undefined';
var config;
export function setConfig(newConfig) {
  config = newConfig;
}
var initDone = false;
export function getConfig() {
  if (!initDone) {
    initTestEnvironment();
    initDone = true;
  }
  return ensureNotFalsy(config, 'testConfig not set');
}
function getEnvVariables() {
  if (isDeno) {
    var ret = {};
    ['DEFAULT_STORAGE', 'NODE_ENV'].forEach(k => {
      ret[k] = Deno.env.get(k);
    });
    return ret;
  }
  return isBun || isNode ? process.env : window.__karma__.config.env;
}
export var ENV_VARIABLES = getEnvVariables();
export var DEFAULT_STORAGE = ENV_VARIABLES.DEFAULT_STORAGE;
export function isFastMode() {
  try {
    return ENV_VARIABLES.NODE_ENV === 'fast';
  } catch (err) {
    return false;
  }
}
export function initTestEnvironment() {
  if (ENV_VARIABLES.NODE_ENV === 'fast') {
    broadcastChannelEnforceOptions({
      type: 'simulate'
    });
  }

  /**
   * Overwrite the console for easier debugging
   */
  var oldConsoleLog = console.log.bind(console);
  var oldConsoleDir = console.dir.bind(console);
  function newLog(value) {
    if (isPromise(value)) {
      oldConsoleDir(value);
      throw new Error('cannot log Promise(), you should await it first');
    }
    if (typeof value === 'string' || typeof value === 'number') {
      oldConsoleLog(value);
      return;
    }
    try {
      JSON.stringify(value);
      oldConsoleLog(JSON.stringify(value, null, 4));
    } catch (err) {
      oldConsoleDir(value);
    }
  }
  console.log = newLog.bind(console);
  console.dir = newLog.bind(console);
  console.log('DEFAULT_STORAGE: ' + DEFAULT_STORAGE);
  if (isNode) {
    process.setMaxListeners(100);
    events.EventEmitter.defaultMaxListeners = 100;

    /**
     * Add a global function to process, so we can debug timings
     */
    process.startTime = performance.now();
    process.logTime = (msg = '') => {
      var diff = performance.now() - process.startTime;
      console.log('process logTime(' + msg + ') ' + diff + 'ms');
    };
  }
}
export function getEncryptedStorage(baseStorage = getConfig().storage.getStorage()) {
  var ret = config.storage.hasEncryption ? baseStorage : wrappedKeyEncryptionCryptoJsStorage({
    storage: baseStorage
  });
  return ret;
}
export function isNotOneOfTheseStorages(storageNames) {
  var isName = getConfig().storage.name;
  if (storageNames.includes(isName)) {
    return false;
  } else {
    return true;
  }
}
export function getPassword() {
  if (getConfig().storage.hasEncryption) {
    return ensureNotFalsy(getConfig().storage.hasEncryption)();
  } else {
    return Promise.resolve('test-password-' + randomToken(10));
  }
}
//# sourceMappingURL=config.js.map