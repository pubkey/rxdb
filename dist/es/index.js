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

/**
 * create a database
 * @param  {string} prefix as databaseName for the storage (this can be the foldername)
 * @param  {Object} storageEngine any leveldown instance
 * @param  {String} password if the database contains encrypted fields
 * @param  {boolean} multiInstance if true, multiInstance-handling will be done
 * @return {Promise<Database>}
 */
export var create = Core.create;

/**
 * removes the database and all its known data
 * @param  {string} databaseName
 * @param  {Object} adapter
 * @return {Promise}
 */
export var removeDatabase = Core.removeDatabase;

/**
 * add a plugin for rxdb or pouchdb
 */
export var plugin = Core.plugin;
export var dbCount = Core.dbCount;
export var isRxDatabase = Core.isRxDatabase;
export var isRxCollection = Core.isRxCollection;
export var isRxDocument = Core.isRxDocument;
export var isRxQuery = Core.isRxQuery;
export var isRxSchema = Core.isRxSchema;
export var RxSchema = Core.RxSchema;
export var PouchDB = Core.PouchDB;
export var QueryChangeDetector = Core.QueryChangeDetector;
export var RxDatabase = Core.RxDatabase;
export var checkAdapter = Core.checkAdapter;

export default {
  create: create,
  checkAdapter: checkAdapter,
  removeDatabase: removeDatabase,
  plugin: plugin,
  dbCount: dbCount,
  isRxDatabase: isRxDatabase,
  isRxCollection: isRxCollection,
  isRxDocument: isRxDocument,
  isRxQuery: isRxQuery,
  isRxSchema: isRxSchema,
  RxSchema: RxSchema,
  PouchDB: PouchDB,
  QueryChangeDetector: QueryChangeDetector,
  RxDatabase: RxDatabase
};