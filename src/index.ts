/**
 * this is the default rxdb-export
 * It has a batteries-included guarantee.
 * It basically just rxdb-core with some default plugins
 */

import {
    addRxPlugin,
    createRxDatabase as createRxDatabaseCore
} from './core';

// default plugins
import { RxDBDevModePlugin } from './plugins/dev-mode';
import { RxDBValidatePlugin } from './plugins/validate';
import { RxDBKeyCompressionPlugin } from './plugins/key-compression';
import { RxDBMigrationPlugin } from './plugins/migration';
import { RxDBLeaderElectionPlugin } from './plugins/leader-election';
import { RxDBEncryptionPlugin } from './plugins/encryption';
import { RxDBUpdatePlugin } from './plugins/update';
import { RxDBReplicationCouchDBPlugin } from './plugins/replication-couchdb';
import { RxDBJsonDumpPlugin } from './plugins/json-dump';
import { RxDBAttachmentsPlugin } from './plugins/attachments';
import { RxDBLocalDocumentsPlugin } from './plugins/local-documents';
import { RxDBQueryBuilderPlugin } from './plugins/query-builder';
import type {
    RxDatabase,
    RxDatabaseCreator,
    RxCollection
} from './types';


let defaultPluginsAdded: boolean = false;

/**
 * Adds the default plugins
 * that are used on non-custom builds.
 */
export function addDefaultRxPlugins() {
    if (defaultPluginsAdded) {
        return;
    }
    defaultPluginsAdded = true;

    addRxPlugin(RxDBDevModePlugin);
    addRxPlugin(RxDBValidatePlugin);
    addRxPlugin(RxDBKeyCompressionPlugin);
    addRxPlugin(RxDBMigrationPlugin);
    addRxPlugin(RxDBLeaderElectionPlugin);
    addRxPlugin(RxDBEncryptionPlugin);
    addRxPlugin(RxDBUpdatePlugin);
    addRxPlugin(RxDBReplicationCouchDBPlugin);
    addRxPlugin(RxDBJsonDumpPlugin);
    addRxPlugin(RxDBAttachmentsPlugin);
    addRxPlugin(RxDBLocalDocumentsPlugin);
    addRxPlugin(RxDBQueryBuilderPlugin);
}

/**
 * Because we have set sideEffects: false
 * in the package.json, we have to ensure that the default plugins
 * are added before the first database is created.
 * So we have to wrap the createRxDatabase function.
 * Always ensure that this function has the same typings as in the rx-database.ts
 * TODO create a type for that function and use it on both sides.
 */
export function createRxDatabase<
    Collections = { [key: string]: RxCollection },
    Internals = any,
    InstanceCreationOptions = any
>(
    params: RxDatabaseCreator<Internals, InstanceCreationOptions>
): Promise<
    RxDatabase<Collections, Internals, InstanceCreationOptions>
> {
    addDefaultRxPlugins();
    return createRxDatabaseCore<Collections, Internals, InstanceCreationOptions>(params);
}

// re-export things from core
export * from './core';

export * from './plugins/pouchdb';
