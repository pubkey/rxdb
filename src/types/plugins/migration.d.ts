import { DataMigrator } from '../../plugins/migration';
import { RxSchema } from '../../rx-schema';
import { RxStorageInstance } from '../rx-storage.interface';
import {
    WithAttachments
} from '../couchdb';
import { RxCollection } from '../rx-collection';
import { RxDatabase } from '../rx-database';
import { MaybePromise } from '../util';

export type MigrationStrategy<DocData = any> = (
    oldDocumentData: WithAttachments<DocData>,
    oldRxCollection: OldRxCollection
) => MaybePromise<WithAttachments<DocData> | null>;

export type MigrationStrategies = {
    [toVersion: number]: MigrationStrategy<any>;
};

export interface OldRxCollection {
    version: number;
    schema: RxSchema;
    storageInstance: RxStorageInstance<any, any, any>;
    dataMigrator: DataMigrator;
    newestCollection: RxCollection;
    database: RxDatabase;
    _migrate?: boolean;
    _migratePromise?: Promise<any>;
}

