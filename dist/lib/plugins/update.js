"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.update = update;
exports.RxQueryUpdate = RxQueryUpdate;
exports.RxDBUpdatePlugin = exports.prototypes = exports.rxdb = void 0;

var _modifyjs = _interopRequireDefault(require("modifyjs"));

/**
 * this plugin allows delta-updates with mongo-like-syntax
 * It's using modifyjs internally
 * @link https://github.com/lgandecki/modifyjs
 */
function update(updateObj) {
  var oldDocData = this._data;
  var newDocData = (0, _modifyjs["default"])(oldDocData, updateObj);
  return this._saveData(newDocData, oldDocData);
}

function RxQueryUpdate(updateObj) {
  return this.exec().then(function (docs) {
    if (!docs) return null;

    if (Array.isArray(docs)) {
      return Promise.all(docs.map(function (doc) {
        return doc.update(updateObj);
      })).then(function () {
        return docs;
      });
    } else {
      // via findOne()
      return docs.update(updateObj).then(function () {
        return docs;
      });
    }
  });
}

var rxdb = true;
exports.rxdb = rxdb;
var prototypes = {
  RxDocument: function RxDocument(proto) {
    proto.update = update;
  },
  RxQuery: function RxQuery(proto) {
    proto.update = RxQueryUpdate;
  }
};
exports.prototypes = prototypes;
var RxDBUpdatePlugin = {
  name: 'update',
  rxdb: rxdb,
  prototypes: prototypes
};
exports.RxDBUpdatePlugin = RxDBUpdatePlugin;

//# sourceMappingURL=update.js.map