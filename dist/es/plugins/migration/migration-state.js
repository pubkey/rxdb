import { BehaviorSubject } from 'rxjs';
import { getFromMapOrCreate } from '../../plugins/utils';
export var DATA_MIGRATION_STATE_SUBJECT_BY_DATABASE = new WeakMap();
export function getMigrationStateByDatabase(database) {
  return getFromMapOrCreate(DATA_MIGRATION_STATE_SUBJECT_BY_DATABASE, database, () => new BehaviorSubject([]));
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