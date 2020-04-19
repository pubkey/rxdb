import type { RxPlugin, RxCollection } from '../../types';
import { DataMigrator } from './data-migrator';
export declare const DATA_MIGRATOR_BY_COLLECTION: WeakMap<RxCollection, DataMigrator>;
export declare const RxDBMigrationPlugin: RxPlugin;
export { _getOldCollections, getBatchOfOldCollection, migrateDocumentData, _migrateDocument, deleteOldCollection, migrateOldCollection, migratePromise, DataMigrator } from './data-migrator';
