"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ERROR_MESSAGES = void 0;
/**
 * this plugin adds the error-messages
 * without it, only error-codes will be shown
 * This is mainly because error-string are hard to compress and we need a smaller build
 */

var ERROR_MESSAGES = {
  // util.js / config
  UT1: 'given name is no string or empty',
  UT2: "collection- and database-names must match the regex to be compatible with couchdb databases.\n    See https://neighbourhood.ie/blog/2020/10/13/everything-you-need-to-know-about-couchdb-database-names/\n    info: if your database-name specifies a folder, the name must contain the slash-char '/' or '\\'",
  UT3: 'replication-direction must either be push or pull or both. But not none',
  UT4: 'given leveldown is no valid adapter',
  UT5: 'keyCompression is set to true in the schema but no key-compression handler is used in the storage',
  UT6: 'schema contains encrypted fields but no encryption handler is used in the storage',
  // plugins
  PL1: 'Given plugin is not RxDB plugin. Pouchdb plugins must be added via addPouchPlugin()',
  PL2: 'You tried importy a RxDB plugin to pouchdb. Use addRxPlugin() instead.',
  PL3: 'A plugin with the same name was already added but it was not the exact same JavaScript object',
  // pouch-db.js
  // removed in 12.0.0 - P1: 'PouchDB.getBatch: limit must be > 2',
  P2: 'bulkWrite() cannot be called with an empty array',
  // removed in 12.0.0 - P3: 'bulkAddRevisions cannot be called with an empty array',

  // rx-query
  QU1: 'RxQuery._execOverDatabase(): op not known',
  // removed in 9.0.0 - QU2: 'limit() must get a number',
  // removed in 9.0.0 - QU3: 'skip() must get a number',
  QU4: 'RxQuery.regex(): You cannot use .regex() on the primary field',
  QU5: 'RxQuery.sort(): does not work because key is not defined in the schema',
  QU6: 'RxQuery.limit(): cannot be called on .findOne()',
  // removed in 12.0.0 (should by ensured by the typings) - QU7: 'query must be an object',
  // removed in 12.0.0 (should by ensured by the typings) - QU8: 'query cannot be an array',
  QU9: 'throwIfMissing can only be used in findOne queries',
  QU10: 'result empty and throwIfMissing: true',
  QU11: 'RxQuery: no valid query params given',
  QU12: 'Given index is not in schema',
  QU13: 'A top level field of the query is not included in the schema',
  QU14: 'Running a count() query in slow mode is now allowed. Either run a count() query with a selector that fully matches an index ' + 'or set allowSlowCount=true when calling the createRxDatabase',
  QU15: 'For count queries it is not allowed to use skip or limit',
  // mquery.js
  MQ1: 'path must be a string or object',
  MQ2: 'Invalid argument',
  MQ3: 'Invalid sort() argument. Must be a string, object, or array',
  MQ4: 'Invalid argument. Expected instanceof mquery or plain object',
  MQ5: 'method must be used after where() when called with these arguments',
  MQ6: 'Can\'t mix sort syntaxes. Use either array or object | .sort([[\'field\', 1], [\'test\', -1]]) | .sort({ field: 1, test: -1 })',
  MQ7: 'Invalid sort value',
  MQ8: 'Can\'t mix sort syntaxes. Use either array or object',
  // rx-database
  DB1: 'RxDocument.prepare(): another instance on this adapter has a different password',
  DB2: 'RxDatabase.addCollections(): collection-names cannot start with underscore _',
  DB3: 'RxDatabase.addCollections(): collection already exists. use myDatabase.[collectionName] to get it',
  DB4: 'RxDatabase.addCollections(): schema is missing',
  DB5: 'RxDatabase.addCollections(): collection-name not allowed',
  DB6: 'RxDatabase.addCollections(): another instance created this collection with a different schema. Read this https://pubkey.github.io/rxdb/questions-answers.html#cant-change-the-schema',
  // removed in 13.0.0 (now part of the encryption plugin) DB7: 'RxDatabase.addCollections(): schema encrypted but no password given',
  DB8: 'RxDatabase.create(): A RxDatabase with the same name and adapter already exists.\n' + 'Make sure to use this combination only once or set ignoreDuplicate to true if you do this intentional',
  DB9: 'createRxDatabase(): Adapter not added. Use addPouchPlugin(require(\'pouchdb-adapter-[adaptername]\'));',
  DB10: 'createRxDatabase(): To use leveldown-adapters, you have to add the leveldb-plugin. Use addPouchPlugin(require(\'pouchdb-adapter-leveldb\'));',
  DB11: 'createRxDatabase(): Invalid db-name, folder-paths must not have an ending slash',
  // rx-collection
  COL1: 'RxDocument.insert() You cannot insert an existing document',
  COL2: 'RxCollection.insert() fieldName ._id can only be used as primaryKey',
  COL3: 'RxCollection.upsert() does not work without primary',
  COL4: 'RxCollection.atomicUpsert() does not work without primary',
  COL5: 'RxCollection.find() if you want to search by _id, use .findOne(_id)',
  COL6: 'RxCollection.findOne() needs a queryObject or string',
  COL7: 'hook must be a function',
  COL8: 'hooks-when not known',
  COL9: 'RxCollection.addHook() hook-name not known',
  COL10: 'RxCollection .postCreate-hooks cannot be async',
  COL11: 'migrationStrategies must be an object',
  COL12: 'A migrationStrategy is missing or too much',
  COL13: 'migrationStrategy must be a function',
  COL14: 'given static method-name is not a string',
  COL15: 'static method-names cannot start with underscore _',
  COL16: 'given static method is not a function',
  COL17: 'RxCollection.ORM: statics-name not allowed',
  COL18: 'collection-method not allowed because fieldname is in the schema',
  COL19: 'Document update conflict. When changing a document you must work on the previous revision',
  // rx-document.js
  DOC1: 'RxDocument.get$ cannot get observable of in-array fields because order cannot be guessed',
  DOC2: 'cannot observe primary path',
  DOC3: 'final fields cannot be observed',
  DOC4: 'RxDocument.get$ cannot observe a non-existed field',
  DOC5: 'RxDocument.populate() cannot populate a non-existed field',
  DOC6: 'RxDocument.populate() cannot populate because path has no ref',
  DOC7: 'RxDocument.populate() ref-collection not in database',
  DOC8: 'RxDocument.set(): primary-key cannot be modified',
  DOC9: 'final fields cannot be modified',
  DOC10: 'RxDocument.set(): cannot set childpath when rootPath not selected',
  DOC11: 'RxDocument.save(): can\'t save deleted document',
  // removed in 10.0.0 DOC12: 'RxDocument.save(): error',
  DOC13: 'RxDocument.remove(): Document is already deleted',
  DOC14: 'RxDocument.destroy() does not exist',
  DOC15: 'query cannot be an array',
  DOC16: 'Since version 8.0.0 RxDocument.set() can only be called on temporary RxDocuments',
  DOC17: 'Since version 8.0.0 RxDocument.save() can only be called on non-temporary documents',
  DOC18: 'Document property for composed primary key is missing',
  DOC19: 'Value of primary key(s) cannot be changed',
  // data-migrator.js
  DM1: 'migrate() Migration has already run',
  DM2: 'migration of document failed final document does not match final schema',
  DM3: 'migration already running',
  // plugins/attachments.js
  AT1: 'to use attachments, please define this in your schema',
  // plugins/encryption.js
  EN1: 'password is no string',
  EN2: 'validatePassword: min-length of password not complied',
  EN3: 'Schema contains encrypted properties but no password is given',
  // plugins/json-dump.js
  JD1: 'You must create the collections before you can import their data',
  JD2: 'RxCollection.importJSON(): the imported json relies on a different schema',
  JD3: 'RxCollection.importJSON(): json.passwordHash does not match the own',
  // plugins/leader-election.js

  // plugins/local-documents.js
  LD1: 'RxDocument.allAttachments$ can\'t use attachments on local documents',
  LD2: 'RxDocument.get(): objPath must be a string',
  LD3: 'RxDocument.get$ cannot get observable of in-array fields because order cannot be guessed',
  LD4: 'cannot observe primary path',
  LD5: 'RxDocument.set() id cannot be modified',
  LD6: 'LocalDocument: Function is not usable on local documents',
  LD7: 'Local document already exists',
  LD8: 'localDocuments not activated. Set localDocuments=true on creation, when you want to store local documents on the RxDatabase or RxCollection.',
  // plugins/replication.js
  RC1: 'Replication: already added',
  RC2: 'RxCollection.syncCouchDB() query must be from the same RxCollection',
  RC3: 'RxCollection.syncCouchDB() Do not use a collection\'s pouchdb as remote, use the collection instead',
  RC4: 'RxCouchDBReplicationState.awaitInitialReplication() cannot await initial replication when live: true',
  RC5: 'RxCouchDBReplicationState.awaitInitialReplication() cannot await initial replication if multiInstance because the replication might run on another instance',
  RC6: 'syncFirestore() serverTimestampField MUST NOT be part of the collections schema and MUST NOT be nested.',
  RC_PULL: 'RxReplication pull handler threw an error - see .errors for more details',
  RC_STREAM: 'RxReplication pull stream$ threw an error - see .errors for more details',
  RC_PUSH: 'RxReplication push handler threw an error - see .errors for more details',
  RC_PUSH_NO_AR: 'RxReplication push handler did not return an array with the conflicts',
  RC_P2P_PEER: 'RxReplication P2P Peer has error',
  // plugins/dev-mode/check-schema.js
  SC1: 'fieldnames do not match the regex',
  SC2: 'SchemaCheck: name \'item\' reserved for array-fields',
  SC3: 'SchemaCheck: fieldname has a ref-array but items-type is not string',
  SC4: 'SchemaCheck: fieldname has a ref but is not type string, [string,null] or array<string>',
  SC6: 'SchemaCheck: primary can only be defined at top-level',
  SC7: 'SchemaCheck: default-values can only be defined at top-level',
  SC8: 'SchemaCheck: first level-fields cannot start with underscore _',
  SC10: 'SchemaCheck: schema defines ._rev, this will be done automatically',
  SC11: 'SchemaCheck: schema needs a number >=0 as version',
  // removed in 10.0.0 - SC12: 'SchemaCheck: primary can only be defined once',
  SC13: 'SchemaCheck: primary is always index, do not declare it as index',
  SC14: 'SchemaCheck: primary is always unique, do not declare it as index',
  SC15: 'SchemaCheck: primary cannot be encrypted',
  SC16: 'SchemaCheck: primary must have type: string',
  SC17: 'SchemaCheck: top-level fieldname is not allowed',
  SC18: 'SchemaCheck: indexes must be an array',
  SC19: 'SchemaCheck: indexes must contain strings or arrays of strings',
  SC20: 'SchemaCheck: indexes.array must contain strings',
  SC21: 'SchemaCheck: given index is not defined in schema',
  SC22: 'SchemaCheck: given indexKey is not type:string',
  SC23: 'SchemaCheck: fieldname is not allowed',
  SC24: 'SchemaCheck: required fields must be set via array. See https://spacetelescope.github.io/understanding-json-schema/reference/object.html#required',
  SC25: 'SchemaCheck: compoundIndexes needs to be specified in the indexes field',
  SC26: 'SchemaCheck: indexes needs to be specified at collection schema level',
  SC27: 'SchemaCheck: encrypted fields need to be specified at collection schema level',
  SC28: 'SchemaCheck: encrypted fields is not defined in the schema',
  SC29: 'SchemaCheck: missing object key \'properties\'',
  SC30: 'SchemaCheck: primaryKey is required',
  SC32: 'SchemaCheck: primary field must have the type string/number/integer',
  SC33: 'SchemaCheck: used primary key is not a property in the schema',
  SC34: 'Fields of type string that are used in an index, must have set the maxLength attribute in the schema',
  SC35: 'Fields of type number/integer that are used in an index, must have set the multipleOf attribute in the schema',
  SC36: 'A field of this type cannot be used as index',
  SC37: 'Fields of type number that are used in an index, must have set the minimum and maximum attribute in the schema',
  SC38: 'Fields of type boolean that are used in an index, must be required in the schema',
  SC39: 'The primary key must have the maxLength attribute set',
  // plugins/dev-mode
  // removed in 13.9.0, use PL3 insated - DEV1: 'dev-mode added multiple times',

  // plugins/validate.js
  VD1: 'Sub-schema not found, does the schemaPath exists in your schema?',
  VD2: 'object does not match schema',
  // plugins/in-memory.js
  IM1: 'InMemory: Memory-Adapter must be added. Use addPouchPlugin(require(\'pouchdb-adapter-memory\'));',
  IM2: 'inMemoryCollection.sync(): Do not replicate with the in-memory instance. Replicate with the parent instead',
  // plugins/server.js
  S1: 'You cannot create collections after calling RxDatabase.server()',
  // plugins/replication-graphql.js
  GQL1: 'GraphQL replication: cannot find sub schema by key',
  // removed in 13.0.0, use RC_PULL instead - GQL2: 'GraphQL replication: unknown errors occurred in replication pull - see innerErrors for more details',
  GQL3: 'GraphQL replication: pull returns more documents then batchSize',
  // removed in 13.0.0, use RC_PUSH instead - GQL4: 'GraphQL replication: unknown errors occurred in replication push - see innerErrors for more details',

  // plugins/crdt/
  CRDT1: 'CRDT operations cannot be used because the crdt options are not set in the schema.',
  CRDT2: 'RxDocument.atomicUpdate() cannot be used when CRDTs are activated.',
  CRDT3: 'To use CRDTs you MUST NOT set a conflictHandler because the default CRDT conflict handler must be used',
  // plugins/dexie/
  DXE1: 'The dexie.js RxStorage does not support boolean indexes, see https://rxdb.info/rx-storage-dexie.html#boolean-index',
  /**
   * Should never be thrown, use this for
   * null checks etc. so you do not have to increase the
   * build size with error message strings.
   */
  SNH: 'This should never happen'
};
exports.ERROR_MESSAGES = ERROR_MESSAGES;
//# sourceMappingURL=error-messages.js.map