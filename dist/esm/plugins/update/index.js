/**
 * this plugin allows delta-updates with mongo-like-syntax
 * It's using mingo internally
 * @link https://github.com/kofrasa/mingo
 */
import { runQueryUpdateFunction } from "../../rx-query-helper.js";
import { mingoUpdater } from "./mingo-updater.js";
export function incrementalUpdate(updateObj) {
  return this.incrementalModify(docData => {
    var newDocData = mingoUpdater(docData, updateObj);
    return newDocData;
  });
}
export function update(updateObj) {
  var oldDocData = this._data;
  var newDocData = mingoUpdater(oldDocData, updateObj);
  return this._saveData(newDocData, oldDocData);
}
export async function RxQueryUpdate(updateObj) {
  return runQueryUpdateFunction(this.asRxQuery, doc => doc.update(updateObj));
}
export var RxDBUpdatePlugin = {
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