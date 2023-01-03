"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxDBUpdatePlugin = void 0;
exports.RxQueryUpdate = RxQueryUpdate;
exports.incrementalUpdate = incrementalUpdate;
exports.update = update;
var _modifyjs = _interopRequireDefault(require("modifyjs"));
/**
 * this plugin allows delta-updates with mongo-like-syntax
 * It's using modifyjs internally
 * @link https://github.com/lgandecki/modifyjs
 */

function incrementalUpdate(updateObj) {
  return this.incrementalModify(docData => {
    var newDocData = (0, _modifyjs.default)(docData, updateObj);
    return newDocData;
  });
}
function update(updateObj) {
  var oldDocData = this._data;
  var newDocData = (0, _modifyjs.default)(oldDocData, updateObj);
  return this._saveData(newDocData, oldDocData);
}
function RxQueryUpdate(updateObj) {
  return this.exec().then(docs => {
    if (!docs) {
      return null;
    }
    if (Array.isArray(docs)) {
      return Promise.all(docs.map(doc => doc.update(updateObj))).then(() => docs);
    } else {
      // via findOne()
      return docs.update(updateObj).then(() => docs);
    }
  });
}
var RxDBUpdatePlugin = {
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
exports.RxDBUpdatePlugin = RxDBUpdatePlugin;
//# sourceMappingURL=index.js.map