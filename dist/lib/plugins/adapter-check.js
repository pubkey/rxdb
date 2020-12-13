"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.checkAdapter = checkAdapter;
exports.RxDBAdapterCheckPlugin = exports.overwritable = exports.prototypes = exports.rxdb = exports.POUCHDB_LOCATION = void 0;

var _pouchDb = require("../pouch-db");

var _util = require("../util");

/**
 * this plugin adds the checkAdapter-function to rxdb
 * you can use it to check if the given adapter is working in the current environmet
 */

/**
 * The same pouchdb-location is used on each run
 * To ensure when this is run multiple times,
 * there will not be many created databases
 */
var POUCHDB_LOCATION = 'rxdb-adapter-check';
exports.POUCHDB_LOCATION = POUCHDB_LOCATION;

function checkAdapter(adapter) {
  // id of the document which is stored and removed to ensure everything works
  var _id = POUCHDB_LOCATION + '-' + (0, _util.generateId)();

  var pouch;

  try {
    pouch = new _pouchDb.PouchDB(POUCHDB_LOCATION, (0, _util.adapterObject)(adapter), {
      auto_compaction: true,
      revs_limit: 1
    });
  } catch (err) {
    return Promise.resolve(false);
  }

  var recoveredDoc;
  return pouch.info() // ensure that we wait until db is useable
  // ensure write works
  .then(function () {
    return pouch.put({
      _id: _id,
      value: {
        ok: true,
        time: new Date().getTime()
      }
    });
  }) // ensure read works
  .then(function () {
    return pouch.get(_id);
  }).then(function (doc) {
    return recoveredDoc = doc;
  }) // ensure remove works
  .then(function () {
    return pouch.remove(recoveredDoc);
  }).then(function () {
    return true;
  }).then(function () {
    if (recoveredDoc && recoveredDoc.value && recoveredDoc.value.ok) return true;else return false;
  })["catch"](function () {
    return false;
  });
  /**
   * NOTICE:
   * Do not remove the pouchdb-instance after the test
   * The problem is that when this function is call in parallel,
   * for example when you restore the tabs from a browser-session and open
   * the same website multiple times at the same time,
   * calling destroy would possibly crash the other call
   */
}

var rxdb = true;
exports.rxdb = rxdb;
var prototypes = {};
exports.prototypes = prototypes;
var overwritable = {
  checkAdapter: checkAdapter
};
exports.overwritable = overwritable;
var RxDBAdapterCheckPlugin = {
  name: 'adapter-check',
  rxdb: rxdb,
  prototypes: prototypes,
  overwritable: overwritable
};
exports.RxDBAdapterCheckPlugin = RxDBAdapterCheckPlugin;

//# sourceMappingURL=adapter-check.js.map