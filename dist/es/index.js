/**
 * this is the default rxdb-export
 * It has a batteries-included guarantee.
 * It basically just rxdb-core with some default plugins
 */
import { addRxPlugin } from './core'; // default plugins

import { RxDBDevModePlugin } from './plugins/dev-mode';
addRxPlugin(RxDBDevModePlugin);
import { RxDBValidatePlugin } from './plugins/validate';
addRxPlugin(RxDBValidatePlugin);
import { RxDBKeyCompressionPlugin } from './plugins/key-compression';
addRxPlugin(RxDBKeyCompressionPlugin);
import { RxDBMigrationPlugin } from './plugins/migration';
addRxPlugin(RxDBMigrationPlugin);
import { RxDBLeaderElectionPlugin } from './plugins/leader-election';
addRxPlugin(RxDBLeaderElectionPlugin);
import { RxDBEncryptionPlugin } from './plugins/encryption';
addRxPlugin(RxDBEncryptionPlugin);
import { RxDBUpdatePlugin } from './plugins/update';
addRxPlugin(RxDBUpdatePlugin);
import { RxDBReplicationCouchDBPlugin } from './plugins/replication-couchdb';
addRxPlugin(RxDBReplicationCouchDBPlugin);
import { RxDBJsonDumpPlugin } from './plugins/json-dump';
addRxPlugin(RxDBJsonDumpPlugin);
import { RxDBInMemoryPlugin } from './plugins/in-memory';
addRxPlugin(RxDBInMemoryPlugin);
import { RxDBAttachmentsPlugin } from './plugins/attachments';
addRxPlugin(RxDBAttachmentsPlugin);
import { RxDBLocalDocumentsPlugin } from './plugins/local-documents';
addRxPlugin(RxDBLocalDocumentsPlugin);
import { RxDBQueryBuilderPlugin } from './plugins/query-builder';
addRxPlugin(RxDBQueryBuilderPlugin); // re-export things from core

export * from './core';
export * from './plugins/pouchdb';
//# sourceMappingURL=index.js.map