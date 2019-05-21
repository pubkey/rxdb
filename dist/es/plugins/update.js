/**
 * this plugin allows delta-updates with mongo-like-syntax
 * It's using modifyjs internally
 * @link https://github.com/lgandecki/modifyjs
 */
import modifyjs from 'modifyjs';
import { clone } from '../util.js';
export function update(updateObj) {
  var oldDocData = clone(this._data);
  var newDocData = modifyjs(oldDocData, updateObj);
  return this._saveData(newDocData, oldDocData);
}
/**
 * 
 * @param {*} updateObj 
 * @return {Promise}
 */

export function RxQueryUpdate(updateObj) {
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
export var rxdb = true;
export var prototypes = {
  RxDocument: function RxDocument(proto) {
    proto.update = update;
  },
  RxQuery: function RxQuery(proto) {
    proto.update = RxQueryUpdate;
  }
};
export default {
  rxdb: rxdb,
  prototypes: prototypes
};