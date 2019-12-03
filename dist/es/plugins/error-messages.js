/**
 * this plugin adds the error-messages
 * without it, only error-codes will be shown
 * This is mainly because error-string are hard to compress and we need a smaller build
 */
var CODES = {
  // util.js
  UT1: 'given name is no string or empty',
  UT2: "collection- and database-names must match the regex\n    info: if your database-name specifies a folder, the name must contain the slash-char '/' or '\\'",
  UT3: 'replication-direction must either be push or pull or both. But not none',
  UT4: 'given leveldown is no valid adapter',
  // pouch-db.js
  P1: 'PouchDB.getBatch: limit must be > 2',
  // rx-query
  QU1: 'RxQuery._execOverDatabase(): op not known',
  QU2: 'limit() must get a number',
  QU3: 'skip() must get a number',
  QU4: 'RxQuery.regex(): You cannot use .regex() on the primary field',
  QU5: 'RxQuery.sort(): does not work because key is not defined in the schema',
  QU6: 'RxQuery.limit(): cannot be called on .findOne()',
  QU7: 'query must be an object',
  QU8: 'query cannot be an array',
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
  DB2: 'RxDatabase.collection(): collection-names cannot start with underscore _',
  DB3: 'RxDatabase.collection(): collection already exists. use myDatabase.[collectionName] to get it',
  DB4: 'RxDatabase.collection(): schema is missing',
  DB5: 'RxDatabase.collection(): collection-name not allowed',
  DB6: 'RxDatabase.collection(): another instance created this collection with a different schema. Read this https://pubkey.github.io/rxdb/questions-answers.html#cant-change-the-schema',
  DB7: 'RxDatabase.collection(): schema encrypted but no password given',
  DB8: 'RxDatabase.create(): A RxDatabase with the same name and adapter already exists.\n' + 'Make sure to use this combination only once or set ignoreDuplicate to true if you do this intentional',
  DB9: 'RxDatabase.create(): Adapter not added. Use RxDB.plugin(require(\'pouchdb-adapter-[adaptername]\');',
  DB10: 'RxDatabase.create(): To use leveldown-adapters, you have to add the leveldb-plugin. Use RxDB.plugin(require(\'pouchdb-adapter-leveldb\'));',
  // rx-collection
  COL1: 'RxDocument.insert() You cannot insert an existing document',
  COL2: 'RxCollection.insert() do not provide ._id when it is not the primary key',
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
  COL19: 'Pouchdb document update conflict',
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
  DOC11: 'RxDocument.save(): cant save deleted document',
  DOC12: 'RxDocument.save(): error',
  DOC13: 'RxDocument.remove(): Document is already deleted',
  DOC14: 'RxDocument.destroy() does not exist',
  DOC15: 'query cannot be an array',
  DOC16: 'Since version 8.0.0 RxDocument.set() can only be called on temporary RxDocuments',
  DOC17: 'Since version 8.0.0 RxDocument.save() can only be called on non-temporary documents',
  // data-migrator.js
  DM1: 'migrate() Migration has already run',
  DM2: 'migration of document failed final document does not match final schema',
  DM3: 'migration already running',
  // plugins/attachments.js
  AT1: 'to use attachments, please define this in your schema',
  // plugins/encryption.js
  EN1: 'password is no string',
  EN2: 'validatePassword: min-length of password not complied',
  // plugins/json-dump.js
  JD1: 'You must create the collections before you can import their data',
  JD2: 'RxCollection.importDump(): the imported json relies on a different schema',
  JD3: 'RxCollection.importDump(): json.passwordHash does not match the own',
  // plugins/leader-election.js
  // plugins/local-documents.js
  LD1: 'RxDocument.allAttachments$ cant use attachments on local documents',
  LD2: 'RxDocument.get(): objPath must be a string',
  LD3: 'RxDocument.get$ cannot get observable of in-array fields because order cannot be guessed',
  LD4: 'cannot observe primary path',
  LD5: 'RxDocument.set() id cannot be modified',
  LD6: 'LocalDocument: Function is not useable on local documents',
  LD7: 'Local document already exists',
  // plugins/replication.js
  RC1: 'Replication: already added',
  RC2: 'RxCollection.sync() query must be from the same RxCollection',
  RC3: 'RxCollection.sync() Do not use a collection\'s pouchdb as remote, use the collection instead',
  // plugins/schema-check.js
  SC1: 'fieldnames do not match the regex',
  SC2: 'SchemaCheck: name \'item\' reserved for array-fields',
  SC3: 'SchemaCheck: fieldname has a ref-array but items-type is not string',
  SC4: 'SchemaCheck: fieldname has a ref but is not type string or array<string>',
  SC5: 'SchemaCheck: fieldname cannot be primary and ref at same time',
  SC6: 'SchemaCheck: primary can only be defined at top-level',
  SC7: 'SchemaCheck: default-values can only be defined at top-level',
  SC8: 'SchemaCheck: first level-fields cannot start with underscore _',
  SC10: 'SchemaCheck: schema defines ._rev, this will be done automatically',
  SC11: 'SchemaCheck: schema needs a number >=0 as version',
  SC12: 'SchemaCheck: primary can only be defined once',
  SC13: 'SchemaCheck: primary is always index, do not declare it as index',
  SC14: 'SchemaCheck: primary is always unique, do not declare it as index',
  SC15: 'SchemaCheck: primary cannot be encrypted',
  SC16: 'SchemaCheck: primary must have type: string',
  SC17: 'SchemaCheck: top-level fieldname is not allowed',
  SC18: 'SchemaCheck: compoundIndexes must be an array',
  SC19: 'SchemaCheck: compoundIndexes must contain arrays',
  SC20: 'SchemaCheck: compoundIndexes.array must contains strings',
  SC21: 'SchemaCheck: given index is not defined in schema',
  SC22: 'SchemaCheck: given indexKey is not type:string',
  SC23: 'SchemaCheck: fieldname is not allowed',
  SC24: 'SchemaCheck: required fields must be set via array. See https://spacetelescope.github.io/understanding-json-schema/reference/object.html#required',
  // plugins/validate.js
  VD1: 'Sub-schema not found, does the schemaPath exists in your schema?',
  VD2: 'object does not match schema',
  // plugins/in-memory.js
  IM1: 'InMemory: Memory-Adapter must be added. Use RxDB.plugin(require(\'pouchdb-adapter-memory\'));',
  IM2: 'inMemoryCollection.sync(): Do not replicate with the in-memory instance. Replicate with the parent instead',
  // plugins/server.js
  S1: 'You cannot create collections after calling RxDatabase.server()',
  // plugins/replication-graphql.js
  QL1: 'TODO'
};
export var rxdb = true;
export var prototypes = {};
export var overwritable = {
  tunnelErrorMessage: function tunnelErrorMessage(code) {
    if (!CODES[code]) {
      console.error('RxDB: Error-Code not known: ' + code);
      throw new Error('Error-Cdoe ' + code + ' not known, contact the maintainer');
    }

    return CODES[code];
  }
};
export default {
  rxdb: rxdb,
  prototypes: prototypes,
  overwritable: overwritable
};
//# sourceMappingURL=error-messages.js.map