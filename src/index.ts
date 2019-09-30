/**
 * this is the default rxdb-export
 * It has a batteries-included guarantee.
 * It basically just rxdb-core with some default plugins
 */

import Core from './core';

// default plugins
import SchemaCheckPlugin from './plugins/schema-check';
Core.plugin(SchemaCheckPlugin);

import ErrorMessagesPlugin from './plugins/error-messages';
Core.plugin(ErrorMessagesPlugin);

import ValidatePlugin from './plugins/validate';
Core.plugin(ValidatePlugin);

import KeyCompressionPlugin from './plugins/key-compression';
Core.plugin(KeyCompressionPlugin);

import LeaderElectionPlugin from './plugins/leader-election';
Core.plugin(LeaderElectionPlugin);

import EncryptionPlugin from './plugins/encryption';
Core.plugin(EncryptionPlugin);

import UpdatePlugin from './plugins/update';
Core.plugin(UpdatePlugin);

import WatchForChangesPlugin from './plugins/watch-for-changes';
Core.plugin(WatchForChangesPlugin);

import ReplicationPlugin from './plugins/replication';
Core.plugin(ReplicationPlugin);

import AdapterCheckPlugin from './plugins/adapter-check';
Core.plugin(AdapterCheckPlugin);

import JsonDumpPlugin from './plugins/json-dump';
Core.plugin(JsonDumpPlugin);

import InMemoryPlugin from './plugins/in-memory';
Core.plugin(InMemoryPlugin);

import AttachmentsPlugin from './plugins/attachments';
Core.plugin(AttachmentsPlugin);

import LocalDocumentsPlugin from './plugins/local-documents';
Core.plugin(LocalDocumentsPlugin);


// rexport things from core
export * from './core';
import {
    create,
    removeDatabase,
    plugin,
    dbCount,
    isRxCollection,
    isRxDatabase,
    isRxDocument,
    isRxQuery,
    isRxSchema,
    PouchDB,
    QueryChangeDetector,
    checkAdapter
} from './core';

// TODO no more default exports
export default {
    create,
    checkAdapter,
    removeDatabase,
    plugin,
    dbCount,
    isRxDatabase,
    isRxCollection,
    isRxDocument,
    isRxQuery,
    isRxSchema,
    PouchDB,
    QueryChangeDetector
};
