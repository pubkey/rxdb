"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DATA_MIGRATION_STATE_SUBJECT_BY_DATABASE = void 0;
exports.getMigrationStateByDatabase = getMigrationStateByDatabase;
exports.onDatabaseDestroy = onDatabaseDestroy;
var _rxjs = require("rxjs");
var _utils = require("../../plugins/utils");
var DATA_MIGRATION_STATE_SUBJECT_BY_DATABASE = exports.DATA_MIGRATION_STATE_SUBJECT_BY_DATABASE = new WeakMap();
function getMigrationStateByDatabase(database) {
  return (0, _utils.getFromMapOrCreate)(DATA_MIGRATION_STATE_SUBJECT_BY_DATABASE, database, () => new _rxjs.BehaviorSubject([]));
}

/**
 * Complete on database destroy
 * so people do not have to unsubscribe
 */
function onDatabaseDestroy(database) {
  var subject = DATA_MIGRATION_STATE_SUBJECT_BY_DATABASE.get(database);
  if (subject) {
    subject.complete();
  }
}
//# sourceMappingURL=migration-state.js.map