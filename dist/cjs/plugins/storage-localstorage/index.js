"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _exportNames = {
  RxStorageLocalstorage: true,
  getRxStorageLocalstorage: true
};
exports.RxStorageLocalstorage = void 0;
exports.getRxStorageLocalstorage = getRxStorageLocalstorage;
var _rxStorageHelper = require("../../rx-storage-helper.js");
var _utilsRxdbVersion = require("../utils/utils-rxdb-version.js");
var _rxStorageInstanceLocalstorage = require("./rx-storage-instance-localstorage.js");
var _localstorageMock = require("./localstorage-mock.js");
Object.keys(_localstorageMock).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _localstorageMock[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _localstorageMock[key];
    }
  });
});
var RxStorageLocalstorage = exports.RxStorageLocalstorage = /*#__PURE__*/function () {
  function RxStorageLocalstorage(settings) {
    this.name = _rxStorageInstanceLocalstorage.RX_STORAGE_NAME_LOCALSTORAGE;
    this.rxdbVersion = _utilsRxdbVersion.RXDB_VERSION;
    this.settings = settings;
  }
  var _proto = RxStorageLocalstorage.prototype;
  _proto.createStorageInstance = function createStorageInstance(params) {
    (0, _rxStorageHelper.ensureRxStorageInstanceParamsAreCorrect)(params);
    var useSettings = Object.assign({}, this.settings, params.options);
    return (0, _rxStorageInstanceLocalstorage.createLocalstorageStorageInstance)(this, params, useSettings);
  };
  return RxStorageLocalstorage;
}();
function getRxStorageLocalstorage(settings = {}) {
  var storage = new RxStorageLocalstorage(settings);
  return storage;
}
//# sourceMappingURL=index.js.map