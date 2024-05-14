"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxDBUpdatePlugin = void 0;
exports.RxQueryUpdate = RxQueryUpdate;
exports.incrementalUpdate = incrementalUpdate;
exports.update = update;
var _rxQueryHelper = require("../../rx-query-helper.js");
var _mingoUpdater = require("./mingo-updater.js");
/**
 * this plugin allows delta-updates with mongo-like-syntax
 * It's using mingo internally
 * @link https://github.com/kofrasa/mingo
 */

function incrementalUpdate(updateObj) {
  return this.incrementalModify(docData => {
    var newDocData = (0, _mingoUpdater.mingoUpdater)(docData, updateObj);
    return newDocData;
  });
}
function update(updateObj) {
  var oldDocData = this._data;
  var newDocData = (0, _mingoUpdater.mingoUpdater)(oldDocData, updateObj);
  return this._saveData(newDocData, oldDocData);
}
async function RxQueryUpdate(updateObj) {
  return (0, _rxQueryHelper.runQueryUpdateFunction)(this.asRxQuery, doc => doc.update(updateObj));
}
var RxDBUpdatePlugin = exports.RxDBUpdatePlugin = {
  name: 'update',
  rxdb: true,
  prototypes: {
    RxDocument: proto => {
      proto.update = update;
      proto.incrementalUpdate = incrementalUpdate;
    },
    RxQuery: proto => {
      proto.update = RxQueryUpdate;
    }
  }
};
//# sourceMappingURL=index.js.map