/**
 * this is the default rxdb-export
 * It has a batteries-included garantie.
 * It basically just rxdb-core with some default plugins
 */

import Core from './core';

// default plugins

import SchemaCheckPlugin from './modules/schema-check';
Core.plugin(SchemaCheckPlugin);

import ValidatePlugin from './modules/validate';
Core.plugin(ValidatePlugin);

import KeyCompressionPlugin from './modules/key-compression';
Core.plugin(KeyCompressionPlugin);

import LeaderelectionPlugin from './modules/leader-election';
Core.plugin(LeaderelectionPlugin);

import EncryptionPlugin from './modules/encryption';
Core.plugin(EncryptionPlugin);

import UpdatePlugin from './modules/update';
Core.plugin(UpdatePlugin);

import ReplicationPlugin from './modules/replication';
Core.plugin(ReplicationPlugin);

import AdapterCheckPlugin from './modules/adapter-check';
Core.plugin(AdapterCheckPlugin);

import JsonDumpPlugin from './modules/json-dump';
Core.plugin(JsonDumpPlugin);

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