import { Crypter } from '../../crypter';
import { KeyCompressor } from '../../plugins/key-compression';
import { DataMigrator } from '../../plugins/migration';
import { RxSchema } from '../../rx-schema';
import { PouchDBInstance, WithAttachments } from '../pouch';
import { RxCollection } from '../rx-collection';
import { RxDatabase } from '../rx-database';
import { MaybePromise } from '../util';

export type MigrationStrategy<DocData = any> = (
    oldDocumentData: WithAttachments<DocData>,
    oldRxCollection: OldRxCollection
) => MaybePromise<WithAttachments<DocData> | null>;

export type MigrationStrategies = {
    [toVersion: number]: MigrationStrategy<any>;
}

export interface OldRxCollection {
    version: number;
    schema: RxSchema;
    pouchdb: PouchDBInstance;
    dataMigrator: DataMigrator;
    _crypter: Crypter;
    _keyCompressor?: KeyCompressor;
    newestCollection: RxCollection;
    database: RxDatabase;
    _migrate?: boolean;
    _migratePromise?: Promise<any>;
}

