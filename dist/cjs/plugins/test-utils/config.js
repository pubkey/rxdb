"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ENV_VARIABLES = exports.DEFAULT_STORAGE = void 0;
exports.getConfig = getConfig;
exports.getEncryptedStorage = getEncryptedStorage;
exports.getPassword = getPassword;
exports.initTestEnvironment = initTestEnvironment;
exports.isDeno = exports.isBun = void 0;
exports.isFastMode = isFastMode;
exports.isNode = void 0;
exports.isNotOneOfTheseStorages = isNotOneOfTheseStorages;
exports.setConfig = setConfig;
var _index = require("../utils/index.js");
var _broadcastChannel = require("broadcast-channel");
var _nodeEvents = _interopRequireDefault(require("node:events"));
var _index2 = require("../encryption-crypto-js/index.js");
/// <reference path="../../../node_modules/@types/mocha/index.d.ts" />

var isDeno = exports.isDeno = typeof Deno !== 'undefined' || typeof window !== 'undefined' && 'Deno' in window;
var isBun = exports.isBun = typeof process !== 'undefined' && !!process.versions.bun;
var isNode = exports.isNode = !isDeno && !isBun && typeof window === 'undefined';
var config;
function setConfig(newConfig) {
  config = newConfig;
}
var initDone = false;
function getConfig() {
  if (!initDone) {
    initTestEnvironment();
    initDone = true;
  }
  return (0, _index.ensureNotFalsy)(config, 'testConfig not set');
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
var ENV_VARIABLES = exports.ENV_VARIABLES = getEnvVariables();
var DEFAULT_STORAGE = exports.DEFAULT_STORAGE = ENV_VARIABLES.DEFAULT_STORAGE;
function isFastMode() {
  try {
    return ENV_VARIABLES.NODE_ENV === 'fast';
  } catch (err) {
    return false;
  }
}
function initTestEnvironment() {
  if (ENV_VARIABLES.NODE_ENV === 'fast') {
    (0, _broadcastChannel.enforceOptions)({
      type: 'simulate'
    });
  }

  /**
   * Overwrite the console for easier debugging
   */
  var oldConsoleLog = console.log.bind(console);
  var oldConsoleDir = console.dir.bind(console);
  function newLog(value) {
    if ((0, _index.isPromise)(value)) {
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
    _nodeEvents.default.EventEmitter.defaultMaxListeners = 100;

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
function getEncryptedStorage(baseStorage = getConfig().storage.getStorage()) {
  var ret = config.storage.hasEncryption ? baseStorage : (0, _index2.wrappedKeyEncryptionCryptoJsStorage)({
    storage: baseStorage
  });
  return ret;
}
function isNotOneOfTheseStorages(storageNames) {
  var isName = getConfig().storage.name;
  if (storageNames.includes(isName)) {
    return false;
  } else {
    return true;
  }
}
function getPassword() {
  if (getConfig().storage.hasEncryption) {
    return (0, _index.ensureNotFalsy)(getConfig().storage.hasEncryption)();
  } else {
    return Promise.resolve('test-password-' + (0, _index.randomToken)(10));
  }
}
//# sourceMappingURL=config.js.map