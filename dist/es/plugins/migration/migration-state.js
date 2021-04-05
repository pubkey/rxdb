import { BehaviorSubject } from 'rxjs';
export var DATA_MIGRATION_STATE_SUBJECT_BY_DATABASE = new WeakMap();
export function getMigrationStateByDatabase(database) {
  if (!DATA_MIGRATION_STATE_SUBJECT_BY_DATABASE.has(database)) {
    DATA_MIGRATION_STATE_SUBJECT_BY_DATABASE.set(database, new BehaviorSubject([]));
  }

  var subject = DATA_MIGRATION_STATE_SUBJECT_BY_DATABASE.get(database);

  if (!subject) {
    // should never happen
    throw new Error('never');
  }

  return subject;
}
/**
 * Complete on database destroy
 * so people do not have to unsubscribe
 */

export function onDatabaseDestroy(database) {
  var subject = DATA_MIGRATION_STATE_SUBJECT_BY_DATABASE.get(database);

  if (subject) {
    subject.complete();
  }
}
//# sourceMappingURL=migration-state.js.map