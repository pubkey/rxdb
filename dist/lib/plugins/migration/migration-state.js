"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DATA_MIGRATION_STATE_SUBJECT_BY_DATABASE = void 0;
exports.getMigrationStateByDatabase = getMigrationStateByDatabase;
exports.onDatabaseDestroy = onDatabaseDestroy;
var _rxjs = require("rxjs");
var _utils = require("../../plugins/utils");
var DATA_MIGRATION_STATE_SUBJECT_BY_DATABASE = new WeakMap();
exports.DATA_MIGRATION_STATE_SUBJECT_BY_DATABASE = DATA_MIGRATION_STATE_SUBJECT_BY_DATABASE;
function getMigrationStateByDatabase(database) {
  if (!DATA_MIGRATION_STATE_SUBJECT_BY_DATABASE.has(database)) {
    DATA_MIGRATION_STATE_SUBJECT_BY_DATABASE.set(database, new _rxjs.BehaviorSubject([]));
  }
  var subject = DATA_MIGRATION_STATE_SUBJECT_BY_DATABASE.get(database);
  return (0, _utils.ensureNotFalsy)(subject);
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