/**
 * this plugin adds the error-messages
 * without it, only error-codes will be shown
 * This is mainly because error-string are hard to compress and we need a smaller build
 */

import { NON_PREMIUM_COLLECTION_LIMIT } from '../utils/utils-premium.ts';


export const ERROR_MESSAGES = {
    // util.js / config
    UT1: {
        code: 'UT1',
        message: 'given name is no string or empty',
        cause: 'The database name must be a non-empty string.',
        fix: 'Check the name used when creating the database.',
        docs: ''
    },
    UT2: {
        code: 'UT2',
        message: `collection- and database-names must match the regex to be compatible with couchdb databases.
    See https://neighbourhood.ie/blog/2020/10/13/everything-you-need-to-know-about-couchdb-database-names/
    info: if your database-name specifies a folder, the name must contain the slash-char '/' or '\\'`,
        cause: 'The database name does not match the regex required for CouchDB compatibility.',
        fix: 'Change the database name to match the regex: ^[a-z][_$a-zA-Z0-9\\-]*$',
        docs: ''
    },
    UT3: {
        code: 'UT3',
        message: 'replication-direction must either be push or pull or both. But not none',
        cause: 'Replication must have at least one direction (push or pull) enabled.',
        fix: 'Set push or pull to true or provide options for them.',
        docs: 'https://rxdb.info/replication.html?console=errors&code=UT3'
    },
    UT4: {
        code: 'UT4',
        message: 'given leveldown is no valid adapter',
        cause: '',
        fix: '',
        docs: ''
    },
    UT5: {
        code: 'UT5',
        message: 'keyCompression is set to true in the schema but no key-compression handler is used in the storage',
        cause: 'Key compression is not supported by this RxStorage adapter or you forgot to add the key-compression plugin.',
        fix: 'Disable key compression in the schema or add the proper plugin.',
        docs: ''
    },
    UT6: {
        code: 'UT6',
        message: 'schema contains encrypted fields but no encryption handler is used in the storage',
        cause: 'Encryption is not supported by this RxStorage adapter or you forgot to add the encryption plugin.',
        fix: 'Disable encryption in the schema or add the proper plugin.',
        docs: 'https://rxdb.info/encryption.html?console=errors&code=UT6'
    },
    UT7: {
        code: 'UT7',
        message: 'attachments.compression is enabled but no attachment-compression plugin is used',
        cause: 'Attachment compression is not supported by this RxStorage adapter or you forgot to add the attachment-compression plugin.',
        fix: 'Disable attachment compression in the schema or add the proper plugin.',
        docs: ''
    },
    UT8: {
        code: 'UT8',
        message: 'crypto.subtle.digest is not available in your runtime. For expo/react-native see https://discord.com/channels/969553741705539624/1341392686267109458/1343639513850843217 ',
        cause: 'The Web Crypto API is not available in this environment.',
        fix: 'Use a polyfill or an environment that supports the Web Crypto API, or provide a custom hash function.',
        docs: 'https://rxdb.info/rx-database.html?console=errors&code=UT8#ignoreduplicate'
    },

    // plugins
    PL1: {
        code: 'PL1',
        message: 'Given plugin is not RxDB plugin.',
        cause: 'The added plugin is not a valid RxDB plugin object.',
        fix: 'Ensure you are adding a valid RxDB plugin object.',
        docs: 'https://rxdb.info/plugins.html?console=errors&code=PL1'
    },
    // removed in 14.0.0 - PouchDB RxStorage was removed - PL2: 'You tried importing a RxDB plugin to pouchdb. Use addRxPlugin() instead.',
    PL3: {
        code: 'PL3',
        message: 'A plugin with the same name was already added but it was not the exact same JavaScript object',
        cause: 'A plugin with the same name has already been added.',
        fix: 'Check if you are adding the same plugin twice or if you have multiple versions of the same plugin.',
        docs: 'https://rxdb.info/plugins.html?console=errors&code=PL3'
    },

    // pouch-db.js
    // removed in 12.0.0 - P1: 'PouchDB.getBatch: limit must be > 2',
    P2: {
        code: 'P2',
        message: 'bulkWrite() cannot be called with an empty array',
        cause: 'bulkWrite was called with an empty array of documents.',
        fix: 'Ensure the array passed to bulkWrite is not empty.',
        docs: ''
    },
    // removed in 12.0.0 - P3: 'bulkAddRevisions cannot be called with an empty array',

    // rx-query
    QU1: {
        code: 'QU1',
        message: 'RxQuery._execOverDatabase(): op not known',
        cause: 'Unknown RxQuery operation.',
        fix: 'This is likely an internal error. Contact the maintainer.',
        docs: ''
    },
    // removed in 9.0.0 - QU2: 'limit() must get a number',
    // removed in 9.0.0 - QU3: 'skip() must get a number',
    QU4: {
        code: 'QU4',
        message: 'RxQuery.regex(): You cannot use .regex() on the primary field',
        cause: 'This is not supported by the query engine.',
        fix: 'Use a different field or a primary key lookup.',
        docs: 'https://rxdb.info/rx-query.html?console=errors&code=QU4'
    },
    QU5: {
        code: 'QU5',
        message: 'RxQuery.sort(): does not work because key is not defined in the schema',
        cause: 'The field used for sorting is not defined in the schema.',
        fix: 'Add the field to the schema or sort by a different field.',
        docs: 'https://rxdb.info/rx-query.html?console=errors&code=QU5#sort'
    },
    QU6: {
        code: 'QU6',
        message: 'RxQuery.limit(): cannot be called on .findOne()',
        cause: 'findOne queries cannot have a limit.',
        fix: 'Remove the limit from the query or use find() instead.',
        docs: 'https://rxdb.info/rx-query.html?console=errors&code=QU6'
    },
    // removed in 12.0.0 (should by ensured by the typings) - QU7: 'query must be an object',
    // removed in 12.0.0 (should by ensured by the typings) - QU8: 'query cannot be an array',
    QU9: {
        code: 'QU9',
        message: 'throwIfMissing can only be used in findOne queries',
        cause: 'throwIfMissing was used on a find query.',
        fix: 'Use findOne if you want to use throwIfMissing or remove the flag.',
        docs: ''
    },
    QU10: {
        code: 'QU10',
        message: 'result empty and throwIfMissing: true',
        cause: 'exec(true) was called but the document was not found.',
        fix: 'Ensure the document exists or do not use the throwIfMissing flag.',
        docs: ''
    },
    QU11: {
        code: 'QU11',
        message: 'RxQuery: no valid query params given',
        cause: 'The query object is not a valid Mango query or contains invalid keys.',
        fix: 'Ensure the query object is a valid Mango query.',
        docs: 'https://rxdb.info/rx-query.html?console=errors&code=QU11'
    },
    QU12: {
        code: 'QU12',
        message: 'Given index is not in schema',
        cause: 'The index used in the query is not defined in the schema.',
        fix: 'Add the index to the schema or use a different index.',
        docs: 'https://rxdb.info/rx-schema.html?console=errors&code=QU12#indexes'
    },
    QU13: {
        code: 'QU13',
        message: 'A top level field of the query is not included in the schema',
        cause: 'A field used in the query is not defined in the schema.',
        fix: 'Ensure all fields in the query are defined in the schema.',
        docs: 'https://rxdb.info/rx-schema.html?console=errors&code=QU13'
    },
    QU14: {
        code: 'QU14',
        message: 'Running a count() query in slow mode is now allowed. Either run a count() query with a selector that fully matches an index ' +
            'or set allowSlowCount=true when calling the createRxDatabase',
        cause: 'A count query is running without an index, which is slow.',
        fix: 'Add an index for the query or allow slow count queries.',
        docs: 'https://rxdb.info/rx-collection.html?console=errors&code=QU14#count'
    },
    QU15: {
        code: 'QU15',
        message: 'For count queries it is not allowed to use skip or limit',
        cause: 'Count queries cannot have a limit or skip.',
        fix: 'Remove limit and skip from the count query.',
        docs: ''
    },
    QU16: {
        code: 'QU16',
        message: '$regex queries must be defined by a string, not an RegExp instance. ' +
            'This is because RegExp objects cannot be JSON stringified and also they are mutable which would be dangerous',
        cause: 'RegExp objects are not allowed in queries.',
        fix: 'Use string based regex operators instead.',
        docs: 'https://rxdb.info/rx-query.html?console=errors&code=QU16#regex'
    },
    QU17: {
        code: 'QU17',
        message: 'Chained queries cannot be used on findByIds() RxQuery instances',
        cause: 'Query builder methods cannot be used with findByIds.',
        fix: 'Use find() if you want to use the query builder.',
        docs: ''
    },
    QU18: {
        code: 'QU18',
        message: 'Malformed query result data. This likely happens because you create a OPFS-storage RxDatabase inside of a worker but did not set the usesRxDatabaseInWorker setting. https://rxdb.info/rx-storage-opfs.html?console=opfs#setting-usesrxdatabaseinworker-when-a-rxdatabase-is-also-used-inside-of-the-worker ',
        cause: 'The result data for the query is undefined or malformed.',
        fix: 'Check if you are using OPFS in a worker correctly.',
        docs: 'https://rxdb.info/rx-storage-opfs.html?console=errors&code=QU18#setting-usesrxdatabaseinworker-when-a-rxdatabase-is-also-used-inside-of-the-worker'
    },
    QU19: {
        code: 'QU19',
        message: 'Queries must not contain fields or properties with the value `undefined`: https://github.com/pubkey/rxdb/issues/6792#issuecomment-2624555824 ',
        cause: 'A field in the query is undefined.',
        fix: 'Ensure all fields in the query have valid values.',
        docs: 'https://github.com/pubkey/rxdb/issues/6792?console=errors&code=QU19#issuecomment-2624555824'
    },

    // mquery.js
    MQ1: {
        code: 'MQ1',
        message: 'path must be a string or object',
        cause: '',
        fix: '',
        docs: ''
    },
    MQ2: {
        code: 'MQ2',
        message: 'Invalid argument',
        cause: '',
        fix: '',
        docs: ''
    },
    MQ3: {
        code: 'MQ3',
        message: 'Invalid sort() argument. Must be a string, object, or array',
        cause: '',
        fix: '',
        docs: ''
    },
    MQ4: {
        code: 'MQ4',
        message: 'Invalid argument. Expected instanceof mquery or plain object',
        cause: '',
        fix: '',
        docs: ''
    },
    MQ5: {
        code: 'MQ5',
        message: 'method must be used after where() when called with these arguments',
        cause: '',
        fix: '',
        docs: ''
    },
    MQ6: {
        code: 'MQ6',
        message: 'Can\'t mix sort syntaxes. Use either array or object | .sort([[\'field\', 1], [\'test\', -1]]) | .sort({ field: 1, test: -1 })',
        cause: '',
        fix: '',
        docs: ''
    },
    MQ7: {
        code: 'MQ7',
        message: 'Invalid sort value',
        cause: '',
        fix: '',
        docs: ''
    },
    MQ8: {
        code: 'MQ8',
        message: 'Can\'t mix sort syntaxes. Use either array or object',
        cause: '',
        fix: '',
        docs: ''
    },

    // rx-database
    DB1: {
        code: 'DB1',
        message: 'RxDocument.prepare(): another instance on this adapter has a different password',
        cause: 'You tried to create a secondary instance on an adapter that is already used by another instance with a different password.',
        fix: 'Ensure that all instances use the same password.',
        docs: 'https://rxdb.info/encryption.html?console=errors&code=DB1'
    },
    DB2: {
        code: 'DB2',
        message: 'RxDatabase.addCollections(): collection-names cannot start with underscore _',
        cause: 'You tried to create a collection where the name starts with an underscore.',
        fix: 'Change the collection name so it does not start with an underscore.',
        docs: 'https://rxdb.info/rx-collection.html?console=errors&code=DB2'
    },
    DB3: {
        code: 'DB3',
        message: 'RxDatabase.addCollections(): collection already exists. use myDatabase[collectionName] to get it',
        cause: 'You tried to add a collection that already exists on this database instance.',
        fix: 'Use the existing collection or use a different name.',
        docs: 'https://rxdb.info/rx-collection.html?console=errors&code=DB3'
    },
    DB4: {
        code: 'DB4',
        message: 'RxDatabase.addCollections(): schema is missing',
        cause: 'You called addCollections() but did not provide a schema for the collection.',
        fix: 'Provide a valid schema for the collection.',
        docs: 'https://rxdb.info/rx-schema.html?console=errors&code=DB4'
    },
    DB5: {
        code: 'DB5',
        message: 'RxDatabase.addCollections(): collection-name not allowed',
        cause: 'You used a collection name that contains invalid characters.',
        fix: 'Use only allowed characters (a-z, A-Z, 0-9, -, _).',
        docs: 'https://rxdb.info/rx-collection.html?console=errors&code=DB5'
    },
    DB6: {
        code: 'DB6',
        message: 'RxDatabase.addCollections(): another instance created this collection with a different schema. Read thishttps://rxdb.info/rx-schema.html?console=qa#faq ',
        cause: 'The schema hash does not match the schema stored in the internal database.',
        fix: 'If you changed the schema, you must increment the version number. If not, check why the hash is different.',
        docs: 'https://rxdb.info/rx-schema.html?console=errors&code=DB6#faq'
    },
    // removed in 13.0.0 (now part of the encryption plugin) DB7: 'RxDatabase.addCollections(): schema encrypted but no password given',
    DB8: {
        code: 'DB8',
        message: 'createRxDatabase(): A RxDatabase with the same name and adapter already exists.\n' +
            'Make sure to use this combination of storage+databaseName only once\n' +
            'If you have the duplicate database on purpose to simulate multi-tab behavior in unit tests, set "ignoreDuplicate: true".\n' +
            'As alternative you can set "closeDuplicates: true" like if this happens in your react projects with hot reload that reloads the code without reloading the process.',
        cause: 'You created multiple RxDatabase instances with the same name and adapter.',
        fix: 'Ensure that you only create one instance of the database.',
        docs: 'https://rxdb.info/rx-database.html?console=errors&code=DB8'
    },
    DB9: {
        code: 'DB9',
        message: 'ignoreDuplicate is only allowed in dev-mode and must never be used in production',
        cause: 'You used the ignoreDuplicate option in a production environment.',
        fix: 'Remove ignoreDuplicate: true or switch to dev-mode.',
        docs: 'https://rxdb.info/rx-database.html?console=errors&code=DB9'
    },
    // removed in 14.0.0 - PouchDB RxStorage is removed - DB9: 'createRxDatabase(): Adapter not added. Use addPouchPlugin(require(\'pouchdb-adapter-[adaptername]\'));',
    // removed in 14.0.0 - PouchDB RxStorage is removed DB10: 'createRxDatabase(): To use leveldown-adapters, you have to add the leveldb-plugin. Use addPouchPlugin(require(\'pouchdb-adapter-leveldb\'));',
    DB11: {
        code: 'DB11',
        message: 'createRxDatabase(): Invalid db-name, folder-paths must not have an ending slash',
        cause: 'The database name or path has a trailing slash.',
        fix: 'Remove the trailing slash from the name/path.',
        docs: 'https://rxdb.info/rx-database.html?console=errors&code=DB11'
    },
    DB12: {
        code: 'DB12',
        message: 'RxDatabase.addCollections(): could not write to internal store',
        cause: 'Writing to the internal storage failed.',
        fix: 'Check your storage configuration and permissions.',
        docs: 'https://rxdb.info/rx-storage.html?console=errors&code=DB12'
    },
    DB13: {
        code: 'DB13',
        message: 'createRxDatabase(): Invalid db-name or collection name, name contains the dollar sign',
        cause: 'The name contains a dollar sign which is not allowed.',
        fix: 'Remove the dollar sign from the name.',
        docs: 'https://rxdb.info/rx-database.html?console=errors&code=DB13'
    },
    DB14: {
        code: 'DB14',
        message: 'no custom reactivity factory added on database creation',
        cause: 'You tried to use reactivity but no factory was provided.',
        fix: 'Add a reactivity factory (e.g. for React, Vue, Angular) or use a plugin that adds one.',
        docs: 'https://rxdb.info/reactivity.html?console=errors&code=DB14'
    },

    // rx-collection
    COL1: {
        code: 'COL1',
        message: 'RxDocument.insert() You cannot insert an existing document',
        cause: 'You tried to insert a document with a primary key that already exists.',
        fix: 'Use upsert() or atomicUpsert() if you want to overwrite.',
        docs: 'https://rxdb.info/rx-collection.html?console=errors&code=COL1#insert'
    },
    COL2: {
        code: 'COL2',
        message: 'RxCollection.insert() fieldName ._id can only be used as primaryKey',
        cause: 'You have a field named "_id" but it is not defined as the primary key.',
        fix: 'Rename the field or use it as the primary key.',
        docs: 'https://rxdb.info/rx-schema.html?console=errors&code=COL2'
    },
    COL3: {
        code: 'COL3',
        message: 'RxCollection.upsert() does not work without primary',
        cause: 'You called upsert() but the document data does not contain the primary key.',
        fix: 'Ensure the primary key is present in the document data.',
        docs: 'https://rxdb.info/rx-collection.html?console=errors&code=COL3#upsert'
    },
    COL4: {
        code: 'COL4',
        message: 'RxCollection.incrementalUpsert() does not work without primary',
        cause: 'You called incrementalUpsert() but the document data does not contain the primary key.',
        fix: 'Ensure the primary key is present in the document data.',
        docs: 'https://rxdb.info/rx-collection.html?console=errors&code=COL4#incrementalupsert'
    },
    COL5: {
        code: 'COL5',
        message: 'RxCollection.find() if you want to search by _id, use .findOne(_id)',
        cause: 'You called find() with a string argument, which was supported in older versions.',
        fix: 'Use findOne(id) to find a single document by ID.',
        docs: 'https://rxdb.info/rx-collection.html?console=errors&code=COL5#find'
    },
    COL6: {
        code: 'COL6',
        message: 'RxCollection.findOne() needs a queryObject or string. Notice that in RxDB, primary keys must be strings and cannot be numbers.',
        cause: 'You called findOne() with an invalid argument (likely a number or array).',
        fix: 'Use a string ID or a mongo-style query object.',
        docs: 'https://rxdb.info/rx-collection.html?console=errors&code=COL6#findone'
    },
    COL7: {
        code: 'COL7',
        message: 'hook must be a function',
        cause: 'You provided a hook that is not a function.',
        fix: 'Ensure the hook is a function.',
        docs: 'https://rxdb.info/middleware.html?console=errors&code=COL7'
    },
    COL8: {
        code: 'COL8',
        message: 'hooks-when not known',
        cause: 'You provided a hook with an invalid "when" parameter (must be "pre" or "post").',
        fix: 'Use "pre" or "post" as the "when" parameter.',
        docs: 'https://rxdb.info/middleware.html?console=errors&code=COL8'
    },
    COL9: {
        code: 'COL9',
        message: 'RxCollection.addHook() hook-name not known',
        cause: 'You provided a hook name that is not known (e.g. insert, save, remove).',
        fix: 'Use a valid hook name.',
        docs: 'https://rxdb.info/middleware.html?console=errors&code=COL9'
    },
    COL10: {
        code: 'COL10',
        message: 'RxCollection .postCreate-hooks cannot be async',
        cause: 'You defined a postCreate hook as async, which is not allowed.',
        fix: 'Make the postCreate hook synchronous.',
        docs: 'https://rxdb.info/middleware.html?console=errors&code=COL10'
    },
    COL11: {
        code: 'COL11',
        message: 'migrationStrategies must be an object',
        cause: 'You provided migration strategies that are not an object.',
        fix: 'Provide an object mapping versions to migration functions.',
        docs: 'https://rxdb.info/migration-schema.html?console=errors&code=COL11'
    },
    COL12: {
        code: 'COL12',
        message: 'A migrationStrategy is missing or too much',
        cause: 'The number of migration strategies does not match the schema version difference.',
        fix: 'Ensure you have a migration strategy for every version step.',
        docs: 'https://rxdb.info/migration-schema.html?console=errors&code=COL12'
    },
    COL13: {
        code: 'COL13',
        message: 'migrationStrategy must be a function',
        cause: 'One of your migration strategies is not a function.',
        fix: 'Ensure all migration strategies are functions.',
        docs: 'https://rxdb.info/migration-schema.html?console=errors&code=COL13'
    },
    COL14: {
        code: 'COL14',
        message: 'given static method-name is not a string',
        cause: 'The name of a static method is not a string.',
        fix: 'Provide a string as the method name.',
        docs: 'https://rxdb.info/orm.html?console=errors&code=COL14'
    },
    COL15: {
        code: 'COL15',
        message: 'static method-names cannot start with underscore _',
        cause: 'You tried to define a static method starting with an underscore.',
        fix: 'Rename the method.',
        docs: 'https://rxdb.info/orm.html?console=errors&code=COL15'
    },
    COL16: {
        code: 'COL16',
        message: 'given static method is not a function',
        cause: 'You provided a static method that is not a function.',
        fix: 'Ensure the static method is a function.',
        docs: 'https://rxdb.info/orm.html?console=errors&code=COL16'
    },
    COL17: {
        code: 'COL17',
        message: 'RxCollection.ORM: statics-name not allowed',
        cause: 'You used a reserved name for a static method.',
        fix: 'Choose a different name for the static method.',
        docs: 'https://rxdb.info/orm.html?console=errors&code=COL17'
    },
    COL18: {
        code: 'COL18',
        message: 'collection-method not allowed because fieldname is in the schema',
        cause: 'You tried to define a collection method that conflicts with a schema field.',
        fix: 'Rename the collection method or the schema field.',
        docs: 'https://rxdb.info/orm.html?console=errors&code=COL18'
    },
    // removed in 14.0.0, use CONFLICT instead - COL19: 'Document update conflict. When changing a document you must work on the previous revision',
    COL20: {
        code: 'COL20',
        message: 'Storage write error',
        cause: 'The storage engine returned an error when writing data.',
        fix: 'Check the error details.',
        docs: 'https://rxdb.info/rx-storage.html?console=errors&code=COL20'
    },
    COL21: {
        code: 'COL21',
        message: 'The RxCollection is closed or removed already, either from this JavaScript realm or from another, like a browser tab',
        cause: 'You tried to access a collection that has been closed or removed.',
        fix: 'Ensure the collection is open before accessing it.',
        docs: ''
    },
    CONFLICT: {
        code: 'CONFLICT',
        message: 'Document update conflict. When changing a document you must work on the previous revision',
        cause: 'You tried to update a document but the revision you provided is not the latest one.',
        fix: 'Fetch the latest document revision and apply your changes again.',
        docs: 'https://rxdb.info/transactions-conflicts-revisions.html?console=errors&code=CONFLICT'
    },
    COL22: {
        code: 'COL22',
        message: '.bulkInsert() and .bulkUpsert() cannot be run with multiple documents that have the same primary key',
        cause: 'You provided multiple documents with the same primary key in a bulk write.',
        fix: 'Ensure all documents in a bulk write have unique primary keys.',
        docs: ''
    },
    COL23: {
        code: 'COL23',
        message: 'In the open-source version of RxDB, the amount of collections that can exist in parallel is limited to ' + NON_PREMIUM_COLLECTION_LIMIT + '. If you already purchased the premium access, you can remove this limit: https://rxdb.info/rx-collection.html?console=limit#faq',
        cause: 'You have reached the limit of open collections for the free version.',
        fix: 'Reduce the number of open collections or upgrade to premium.',
        docs: 'https://rxdb.info/premium.html?console=errors&code=COL23'
    },

    // rx-document.js
    DOC1: {
        code: 'DOC1',
        message: 'RxDocument.get$ cannot get observable of in-array fields because order cannot be guessed',
        cause: 'You tried to observe an array item, which is not supported.',
        fix: 'Observe the array field itself.',
        docs: ''
    },
    DOC2: {
        code: 'DOC2',
        message: 'cannot observe primary path',
        cause: 'You tried to observe the primary key, which is immutable.',
        fix: 'Observe the document itself or use findOne().',
        docs: ''
    },
    DOC3: {
        code: 'DOC3',
        message: 'final fields cannot be observed',
        cause: 'You tried to observe a final field, which is immutable.',
        fix: 'Observe the document itself.',
        docs: ''
    },
    DOC4: {
        code: 'DOC4',
        message: 'RxDocument.get$ cannot observe a non-existed field',
        cause: 'The field you tried to observe is not defined in the schema.',
        fix: 'Check the field name and schema definition.',
        docs: ''
    },
    DOC5: {
        code: 'DOC5',
        message: 'RxDocument.populate() cannot populate a non-existed field',
        cause: 'The field you tried to populate is not defined in the schema.',
        fix: 'Check the field name and schema definition.',
        docs: 'https://rxdb.info/population.html?console=errors&code=DOC5'
    },
    DOC6: {
        code: 'DOC6',
        message: 'RxDocument.populate() cannot populate because path has no ref',
        cause: 'The field you tried to populate does not have a "ref" property in the schema.',
        fix: 'Add the "ref" property to the field schema.',
        docs: 'https://rxdb.info/population.html?console=errors&code=DOC6'
    },
    DOC7: {
        code: 'DOC7',
        message: 'RxDocument.populate() ref-collection not in database',
        cause: 'The collection referenced in the schema does not exist.',
        fix: 'Create the referenced collection.',
        docs: 'https://rxdb.info/population.html?console=errors&code=DOC7'
    },
    DOC8: {
        code: 'DOC8',
        message: 'RxDocument.set(): primary-key cannot be modified',
        cause: 'You tried to modify the primary key of a document.',
        fix: 'Primary keys are immutable. Create a new document with the new ID instead.',
        docs: ''
    },
    DOC9: {
        code: 'DOC9',
        message: 'final fields cannot be modified',
        cause: 'You tried to modify a field marked as final in the schema.',
        fix: 'Final fields are immutable.',
        docs: ''
    },
    DOC10: {
        code: 'DOC10',
        message: 'RxDocument.set(): cannot set childpath when rootPath not selected',
        cause: 'You tried to set a nested field without having the root path in the document data.',
        fix: 'Ensure the root path exists before setting nested fields.',
        docs: ''
    },
    DOC11: {
        code: 'DOC11',
        message: 'RxDocument.save(): can\'t save deleted document',
        cause: 'You tried to save a document that has already been deleted.',
        fix: 'Do not save deleted documents. Insert them again if you want to recreate them.',
        docs: ''
    },
    // removed in 10.0.0 DOC12: 'RxDocument.save(): error',
    DOC13: {
        code: 'DOC13',
        message: 'RxDocument.remove(): Document is already deleted',
        cause: 'You tried to remove a document that is already deleted.',
        fix: 'Check if the document is deleted before removing it.',
        docs: ''
    },
    DOC14: {
        code: 'DOC14',
        message: 'RxDocument.close() does not exist',
        cause: 'You called close() on a RxDocument, which is not supported.',
        fix: 'Documents do not need to be closed.',
        docs: ''
    },
    DOC15: {
        code: 'DOC15',
        message: 'query cannot be an array',
        cause: 'You provided an array as a query, which is not valid.',
        fix: 'Provide a valid query object.',
        docs: ''
    },
    DOC16: {
        code: 'DOC16',
        message: 'Since version 8.0.0 RxDocument.set() can only be called on temporary RxDocuments',
        cause: 'You called set() on a non-temporary document.',
        fix: 'Use update(), atomicUpdate(), patch() or modify() to change document data.',
        docs: 'https://rxdb.info/rx-document.html?console=errors&code=DOC16#update'
    },
    DOC17: {
        code: 'DOC17',
        message: 'Since version 8.0.0 RxDocument.save() can only be called on non-temporary documents',
        cause: 'You called save() on a temporary document.',
        fix: 'Use another method to save the document or ensure it is not temporary.',
        docs: 'https://rxdb.info/rx-document.html?console=errors&code=DOC17#save'
    },
    DOC18: {
        code: 'DOC18',
        message: 'Document property for composed primary key is missing',
        cause: 'A field required for the composite primary key is missing in the document data.',
        fix: 'Ensure all fields of the composite primary key are set.',
        docs: 'https://rxdb.info/rx-schema.html?console=errors&code=DOC18#composite-primary-key'
    },
    DOC19: {
        code: 'DOC19',
        message: 'Value of primary key(s) cannot be changed',
        cause: 'You tried to modify the primary key of a document.',
        fix: 'Primary keys are immutable. Create a new document with the new ID instead.',
        docs: 'https://rxdb.info/rx-schema.html?console=errors&code=DOC19#primary-key'
    },
    DOC20: {
        code: 'DOC20',
        message: 'PrimaryKey missing',
        cause: 'The document data is missing a primary key.',
        fix: 'Ensure the document has a primary key.',
        docs: 'https://rxdb.info/rx-schema.html?console=errors&code=DOC20#primary-key'
    },
    DOC21: {
        code: 'DOC21',
        message: 'PrimaryKey must be equal to PrimaryKey.trim(). It cannot start or end with a whitespace',
        cause: 'The primary key contains leading or trailing whitespace.',
        fix: 'Trim the primary key.',
        docs: 'https://rxdb.info/rx-schema.html?console=errors&code=DOC21#primary-key'
    },
    DOC22: {
        code: 'DOC22',
        message: 'PrimaryKey must not contain a linebreak',
        cause: 'The primary key contains newline characters.',
        fix: 'Remove newline characters from the primary key.',
        docs: 'https://rxdb.info/rx-schema.html?console=errors&code=DOC22#primary-key'
    },
    DOC23: {
        code: 'DOC23',
        message: 'PrimaryKey must not contain a double-quote ["]',
        cause: 'The primary key contains double quotes.',
        fix: 'Remove double quotes from the primary key.',
        docs: 'https://rxdb.info/rx-schema.html?console=errors&code=DOC23#primary-key'
    },
    DOC24: {
        code: 'DOC24',
        message: 'Given document data could not be structured cloned. This happens if you pass non-plain-json data into it, like a Date() object or a Function. ' +
            'In vue.js this happens if you use ref() on the document data which transforms it into a Proxy object.',
        cause: 'The document data contains objects that cannot be structured-cloned (e.g. Date, RegExp).',
        fix: 'Use only JSON-serializable data. Store dates as strings.',
        docs: 'https://rxdb.info/rx-schema.html?console=errors&code=DOC24'
    },

    // data-migrator.js
    DM1: {
        code: 'DM1',
        message: 'migrate() Migration has already run',
        cause: 'You tried to run the migration manually but it has already been finished.',
        fix: 'Check if the migration is already done.',
        docs: 'https://rxdb.info/migration-schema.html?console=errors&code=DM1'
    },
    DM2: {
        code: 'DM2',
        message: 'migration of document failed final document does not match final schema',
        cause: 'The migration strategy produced a document that does not match the new schema.',
        fix: 'Check your migration strategy and the new schema.',
        docs: 'https://rxdb.info/migration-schema.html?console=errors&code=DM2'
    },
    DM3: {
        code: 'DM3',
        message: 'migration already running',
        cause: 'You started the migration while another migration is already running.',
        fix: 'Await the running migration.',
        docs: 'https://rxdb.info/migration-schema.html?console=errors&code=DM3'
    },
    DM4: {
        code: 'DM4',
        message: 'Migration errored',
        cause: 'An error occurred during migration.',
        fix: 'Check the error details.',
        docs: 'https://rxdb.info/migration-schema.html?console=errors&code=DM4'
    },
    DM5: {
        code: 'DM5',
        message: 'Cannot open database state with newer RxDB version. You have to migrate your database state first. See https://rxdb.info/migration-storage.html?console=storage ',
        cause: 'The database was created with an older RxDB version and needs migration.',
        fix: 'Run the storage migration.',
        docs: 'https://rxdb.info/migration-storage.html?console=errors&code=DM5'
    },

    // plugins/attachments.js
    AT1: {
        code: 'AT1',
        message: 'to use attachments, please define this in your schema',
        cause: 'You tried to use attachments but they are not enabled in the schema.',
        fix: 'Enable attachments in the schema.',
        docs: 'https://rxdb.info/rx-attachment.html?console=errors&code=AT1'
    },

    // plugins/encryption-crypto-js.js
    EN1: {
        code: 'EN1',
        message: 'password is not valid',
        cause: 'The password provided is invalid (must be a string).',
        fix: 'Provide a valid string password.',
        docs: 'https://rxdb.info/encryption.html?console=errors&code=EN1'
    },
    EN2: {
        code: 'EN2',
        message: 'validatePassword: min-length of password not complied',
        cause: 'The password is too short.',
        fix: 'Use a longer password (min 12 chars).',
        docs: 'https://rxdb.info/encryption.html?console=errors&code=EN2'
    },
    EN3: {
        code: 'EN3',
        message: 'Schema contains encrypted properties but no password is given',
        cause: 'Encryption enabled in schema but no password provided.',
        fix: 'Provide a password.',
        docs: 'https://rxdb.info/encryption.html?console=errors&code=EN3'
    },
    EN4: {
        code: 'EN4',
        message: 'Password not valid',
        cause: 'The password provided is invalid.',
        fix: 'Check the password.',
        docs: 'https://rxdb.info/encryption.html?console=errors&code=EN4'
    },

    // plugins/json-dump.js
    JD1: {
        code: 'JD1',
        message: 'You must create the collections before you can import their data',
        cause: 'Importing data into a non-existent collection.',
        fix: 'Create the collection before importing.',
        docs: 'https://rxdb.info/backup.html?console=errors&code=JD1'
    },
    JD2: {
        code: 'JD2',
        message: 'RxCollection.importJSON(): the imported json relies on a different schema',
        cause: 'The imported data schema does not match the collection schema.',
        fix: 'Ensure schemas match.',
        docs: 'https://rxdb.info/backup.html?console=errors&code=JD2'
    },
    JD3: {
        code: 'JD3',
        message: 'RxCollection.importJSON(): json.passwordHash does not match the own',
        cause: 'Password mismatch in import.',
        fix: 'Use the same password.',
        docs: 'https://rxdb.info/backup.html?console=errors&code=JD3'
    },

    // plugins/leader-election.js

    // plugins/local-documents.js
    LD1: {
        code: 'LD1',
        message: 'RxDocument.allAttachments$ can\'t use attachments on local documents',
        cause: 'You tried to use attachments on a local document, which is not supported.',
        fix: 'Do not use attachments with local documents.',
        docs: 'https://rxdb.info/rx-local-document.html?console=errors&code=LD1'
    },
    LD2: {
        code: 'LD2',
        message: 'RxDocument.get(): objPath must be a string',
        cause: 'The object path provided to get() is not a string.',
        fix: 'Provide a valid string path.',
        docs: 'https://rxdb.info/rx-local-document.html?console=errors&code=LD2'
    },
    LD3: {
        code: 'LD3',
        message: 'RxDocument.get$ cannot get observable of in-array fields because order cannot be guessed',
        cause: 'You tried to observe an array item in a local document.',
        fix: 'Observe the whole array instead.',
        docs: 'https://rxdb.info/rx-local-document.html?console=errors&code=LD3'
    },
    LD4: {
        code: 'LD4',
        message: 'cannot observe primary path',
        cause: 'You tried to observe the primary path of a local document.',
        fix: 'Observe the document data instead.',
        docs: 'https://rxdb.info/rx-local-document.html?console=errors&code=LD4'
    },
    LD5: {
        code: 'LD5',
        message: 'RxDocument.set() id cannot be modified',
        cause: 'You tried to modify the ID of a local document.',
        fix: 'IDs are immutable. Create a new document if needed.',
        docs: 'https://rxdb.info/rx-local-document.html?console=errors&code=LD5'
    },
    LD6: {
        code: 'LD6',
        message: 'LocalDocument: Function is not usable on local documents',
        cause: 'You called a function that is not supported on local documents.',
        fix: 'Check the documentation for supported methods.',
        docs: 'https://rxdb.info/rx-local-document.html?console=errors&code=LD6'
    },
    LD7: {
        code: 'LD7',
        message: 'Local document already exists',
        cause: 'You tried to create a local document that already exists.',
        fix: 'Use upsert() or update the existing document.',
        docs: 'https://rxdb.info/rx-local-document.html?console=errors&code=LD7'
    },
    LD8: {
        code: 'LD8',
        message: 'localDocuments not activated. Set localDocuments=true on creation, when you want to store local documents on the RxDatabase or RxCollection.',
        cause: 'You tried to use local documents but they are not enabled.',
        fix: 'Enable local documents when creating the database or collection.',
        docs: 'https://rxdb.info/rx-local-document.html?console=errors&code=LD8'
    },

    // plugins/replication.js
    RC1: {
        code: 'RC1',
        message: 'Replication: already added',
        cause: 'You started a replication that is already running.',
        fix: 'Check if the replication is already running before starting it.',
        docs: 'https://rxdb.info/replication.html?console=errors&code=RC1'
    },
    RC2: {
        code: 'RC2',
        message: 'replicateCouchDB() query must be from the same RxCollection',
        cause: 'You used a query from a different collection for replication.',
        fix: 'Use a query from the same collection.',
        docs: 'https://rxdb.info/replication-couchdb.html?console=errors&code=RC2'
    },
    // removed in 14.0.0 - PouchDB RxStorage is removed RC3: 'RxCollection.syncCouchDB() Do not use a collection\'s pouchdb as remote, use the collection instead',
    RC4: {
        code: 'RC4',
        message: 'RxCouchDBReplicationState.awaitInitialReplication() cannot await initial replication when live: true',
        cause: 'You tried to await initial replication on a live replication.',
        fix: 'Set live: false if you want to await initial replication.',
        docs: 'https://rxdb.info/replication-couchdb.html?console=errors&code=RC4'
    },
    RC5: {
        code: 'RC5',
        message: 'RxCouchDBReplicationState.awaitInitialReplication() cannot await initial replication if multiInstance because the replication might run on another instance',
        cause: 'You tried to await initial replication in a multi-instance environment.',
        fix: 'Await initial replication only in single-instance mode.',
        docs: 'https://rxdb.info/replication-couchdb.html?console=errors&code=RC5'
    },
    RC6: {
        code: 'RC6',
        message: 'syncFirestore() serverTimestampField MUST NOT be part of the collections schema and MUST NOT be nested.',
        cause: 'The serverTimestampField is defined in the schema or is nested.',
        fix: 'Remove the serverTimestampField from the schema and ensure it is at the top level.',
        docs: 'https://rxdb.info/replication-firestore.html?console=errors&code=RC6'
    },
    RC7: {
        code: 'RC7',
        message: 'SimplePeer requires to have process.nextTick() polyfilled, see https://rxdb.info/replication-webrtc.html?console=webrtc ',
        cause: 'process.nextTick is missing in the runtime environment.',
        fix: 'Polyfill process.nextTick.',
        docs: 'https://rxdb.info/replication-webrtc.html?console=errors&code=RC7'
    },
    RC_PULL: {
        code: 'RC_PULL',
        message: 'RxReplication pull handler threw an error - see .errors for more details',
        cause: 'The pull handler of the replication threw an error.',
        fix: 'Check the error details in the .errors observable.',
        docs: 'https://rxdb.info/replication.html?console=errors&code=RC_PULL'
    },
    RC_STREAM: {
        code: 'RC_STREAM',
        message: 'RxReplication pull stream$ threw an error - see .errors for more details',
        cause: 'The pull stream of the replication threw an error.',
        fix: 'Check the error details in the .errors observable.',
        docs: 'https://rxdb.info/replication.html?console=errors&code=RC_STREAM'
    },
    RC_PUSH: {
        code: 'RC_PUSH',
        message: 'RxReplication push handler threw an error - see .errors for more details',
        cause: 'The push handler of the replication threw an error.',
        fix: 'Check the error details in the .errors observable.',
        docs: 'https://rxdb.info/replication.html?console=errors&code=RC_PUSH'
    },
    RC_PUSH_NO_AR: {
        code: 'RC_PUSH_NO_AR',
        message: 'RxReplication push handler did not return an array with the conflicts',
        cause: 'The push handler returned a non-array value.',
        fix: 'Ensure the push handler returns an array of conflicting documents.',
        docs: 'https://rxdb.info/replication.html?console=errors&code=RC_PUSH_NO_AR'
    },
    RC_WEBRTC_PEER: {
        code: 'RC_WEBRTC_PEER',
        message: 'RxReplication WebRTC Peer has error',
        cause: 'A WebRTC peer connection error occurred.',
        fix: 'Check the network connection and WebRTC configuration.',
        docs: 'https://rxdb.info/replication-webrtc.html?console=errors&code=RC_WEBRTC_PEER'
    },
    RC_COUCHDB_1: {
        code: 'RC_COUCHDB_1',
        message: 'replicateCouchDB() url must end with a slash like \'https://example.com/mydatabase/\'',
        cause: 'The CouchDB URL is missing a trailing slash.',
        fix: 'Add a trailing slash to the URL.',
        docs: 'https://rxdb.info/replication-couchdb.html?console=errors&code=RC_COUCHDB_1'
    },
    RC_COUCHDB_2: {
        code: 'RC_COUCHDB_2',
        message: 'replicateCouchDB() did not get valid result with rows.',
        cause: 'The CouchDB endpoint returned an invalid response.',
        fix: 'Check the CouchDB server and the URL.',
        docs: 'https://rxdb.info/replication-couchdb.html?console=errors&code=RC_COUCHDB_2'
    },
    RC_OUTDATED: {
        code: 'RC_OUTDATED',
        message: 'Outdated client, update required. Replication was canceled',
        cause: 'The client version is too old for the server.',
        fix: 'Update the client application.',
        docs: 'https://rxdb.info/replication.html?console=errors&code=RC_OUTDATED'
    },
    RC_UNAUTHORIZED: {
        code: 'RC_UNAUTHORIZED',
        message: 'Unauthorized client, update the replicationState.headers to set correct auth data',
        cause: 'The client is not authorized to replicate.',
        fix: 'Update authentication headers.',
        docs: 'https://rxdb.info/replication.html?console=errors&code=RC_UNAUTHORIZED'
    },
    RC_FORBIDDEN: {
        code: 'RC_FORBIDDEN',
        message: 'Client behaves wrong so the replication was canceled. Mostly happens if the client tries to write data that it is not allowed to',
        cause: 'The server rejected the replication request.',
        fix: 'Check server permissions and logs.',
        docs: 'https://rxdb.info/replication.html?console=errors&code=RC_FORBIDDEN'
    },

    // plugins/dev-mode/check-schema.js
    SC1: {
        code: 'SC1',
        message: 'fieldnames do not match the regex',
        cause: 'A field name in the schema contains invalid characters.',
        fix: 'Use only allowed characters (a-z, A-Z, 0-9, _, -).',
        docs: 'https://rxdb.info/rx-schema.html?console=errors&code=SC1'
    },
    SC2: {
        code: 'SC2',
        message: 'SchemaCheck: name \'item\' reserved for array-fields',
        cause: 'You used "item" as a field name, but it is reserved.',
        fix: 'Rename the field.',
        docs: 'https://rxdb.info/rx-schema.html?console=errors&code=SC2'
    },
    SC3: {
        code: 'SC3',
        message: 'SchemaCheck: fieldname has a ref-array but items-type is not string',
        cause: 'You defined a reference array but the items are not of type string.',
        fix: 'Set the items type to string.',
        docs: 'https://rxdb.info/population.html?console=errors&code=SC3'
    },
    SC4: {
        code: 'SC4',
        message: 'SchemaCheck: fieldname has a ref but is not type string, [string,null] or array<string>',
        cause: 'You defined a reference field but the type is not string or array of strings.',
        fix: 'Set the type to string or array of strings.',
        docs: 'https://rxdb.info/population.html?console=errors&code=SC4'
    },
    SC6: {
        code: 'SC6',
        message: 'SchemaCheck: primary can only be defined at top-level',
        cause: 'You defined the primary key in a nested object.',
        fix: 'Move the primary key definition to the top level.',
        docs: 'https://rxdb.info/rx-schema.html?console=errors&code=SC6#primary-key'
    },
    SC7: {
        code: 'SC7',
        message: 'SchemaCheck: default-values can only be defined at top-level',
        cause: 'You defined a default value in a nested object.',
        fix: 'Move default values to the top level.',
        docs: 'https://rxdb.info/rx-schema.html?console=errors&code=SC7'
    },
    SC8: {
        code: 'SC8',
        message: 'SchemaCheck: first level-fields cannot start with underscore _',
        cause: 'A top-level field name starts with an underscore.',
        fix: 'Rename the field.',
        docs: 'https://rxdb.info/rx-schema.html?console=errors&code=SC8'
    },
    SC10: {
        code: 'SC10',
        message: 'SchemaCheck: schema defines ._rev, this will be done automatically',
        cause: 'You defined _rev in your schema.',
        fix: 'Remove _rev from the schema.',
        docs: 'https://rxdb.info/rx-schema.html?console=errors&code=SC10'
    },
    SC11: {
        code: 'SC11',
        message: 'SchemaCheck: schema needs a number >=0 as version',
        cause: 'The version field is missing or invalid.',
        fix: 'Set a valid version number (>=0).',
        docs: 'https://rxdb.info/rx-schema.html?console=errors&code=SC11#version'
    },
    // removed in 10.0.0 - SC12: 'SchemaCheck: primary can only be defined once',
    SC13: {
        code: 'SC13',
        message: 'SchemaCheck: primary is always index, do not declare it as index',
        cause: 'You declared the primary key as an index, which is redundant.',
        fix: 'Remove index: true from the primary key field.',
        docs: 'https://rxdb.info/rx-schema.html?console=errors&code=SC13'
    },
    SC14: {
        code: 'SC14',
        message: 'SchemaCheck: primary is always unique, do not declare it as index',
        cause: 'You declared the primary key as unique, which is redundant.',
        fix: 'Remove unique: true from the primary key field.',
        docs: 'https://rxdb.info/rx-schema.html?console=errors&code=SC14'
    },
    SC15: {
        code: 'SC15',
        message: 'SchemaCheck: primary cannot be encrypted',
        cause: 'You tried to encrypt the primary key.',
        fix: 'Primary keys cannot be encrypted.',
        docs: 'https://rxdb.info/encryption.html?console=errors&code=SC15'
    },
    SC16: {
        code: 'SC16',
        message: 'SchemaCheck: primary must have type: string',
        cause: 'The primary key field has a type other than string.',
        fix: 'Set the primary key type to string.',
        docs: 'https://rxdb.info/rx-schema.html?console=errors&code=SC16#primary-key'
    },
    SC17: {
        code: 'SC17',
        message: 'SchemaCheck: top-level fieldname is not allowed. See https://rxdb.info/rx-schema.html?console=toplevel#non-allowed-properties ',
        cause: 'You used a reserved name for a top-level field.',
        fix: 'Rename the field.',
        docs: 'https://rxdb.info/rx-schema.html?console=errors&code=SC17'
    },
    SC18: {
        code: 'SC18',
        message: 'SchemaCheck: indexes must be an array',
        cause: 'The indexes property is not an array.',
        fix: 'Set indexes to an array of strings or arrays.',
        docs: 'https://rxdb.info/rx-schema.html?console=errors&code=SC18#indexes'
    },
    SC19: {
        code: 'SC19',
        message: 'SchemaCheck: indexes must contain strings or arrays of strings',
        cause: 'An index definition is invalid.',
        fix: 'Ensure indexes are strings or arrays of strings.',
        docs: 'https://rxdb.info/rx-schema.html?console=errors&code=SC19#indexes'
    },
    SC20: {
        code: 'SC20',
        message: 'SchemaCheck: indexes.array must contain strings',
        cause: 'A compound index contains non-string values.',
        fix: 'Ensure compound indexes contain only strings.',
        docs: 'https://rxdb.info/rx-schema.html?console=errors&code=SC20#indexes'
    },
    SC21: {
        code: 'SC21',
        message: 'SchemaCheck: given index is not defined in schema',
        cause: 'You defined an index for a field that does not exist.',
        fix: 'Check the field name in the index.',
        docs: 'https://rxdb.info/rx-schema.html?console=errors&code=SC21#indexes'
    },
    SC22: {
        code: 'SC22',
        message: 'SchemaCheck: given indexKey is not type:string',
        cause: 'You defined an index on a non-string field.',
        fix: 'Indexes are only supported on string fields (mostly).',
        docs: 'https://rxdb.info/rx-schema.html?console=errors&code=SC22#indexes'
    },
    SC23: {
        code: 'SC23',
        message: 'SchemaCheck: fieldname is not allowed',
        cause: 'You used a field name that is not allowed (e.g. starts with $ or _).',
        fix: 'Rename the field.',
        docs: 'https://rxdb.info/rx-schema.html?console=errors&code=SC23'
    },
    SC24: {
        code: 'SC24',
        message: 'SchemaCheck: required fields must be set via array. See https://spacetelescope.github.io/understanding-json-schema/reference/object.html#required',
        cause: 'The required fields are not defined as an array of strings.',
        fix: 'Set required to an array of strings.',
        docs: 'https://rxdb.info/rx-schema.html?console=errors&code=SC24'
    },
    SC25: {
        code: 'SC25',
        message: 'SchemaCheck: compoundIndexes needs to be specified in the indexes field',
        cause: 'Compound indexes are not defined correctly.',
        fix: 'Define compound indexes in the indexes array.',
        docs: 'https://rxdb.info/rx-schema.html?console=errors&code=SC25#indexes'
    },
    SC26: {
        code: 'SC26',
        message: 'SchemaCheck: indexes needs to be specified at collection schema level',
        cause: 'Indexes are defined at the wrong level (e.g. inside properties).',
        fix: 'Move indexes to the top level of the schema.',
        docs: 'https://rxdb.info/rx-schema.html?console=errors&code=SC26#indexes'
    },
    // removed in 16.0.0 - SC27: 'SchemaCheck: encrypted fields need to be specified at collection schema level',
    SC28: {
        code: 'SC28',
        message: 'SchemaCheck: encrypted fields is not defined in the schema',
        cause: 'You tried to use encryption but encrypted fields are not defined.',
        fix: 'Define encrypted fields in the schema.',
        docs: 'https://rxdb.info/encryption.html?console=errors&code=SC28'
    },
    SC29: {
        code: 'SC29',
        message: 'SchemaCheck: missing object key \'properties\'',
        cause: 'The schema is missing the "properties" field.',
        fix: 'Add the "properties" field to the schema.',
        docs: 'https://rxdb.info/rx-schema.html?console=errors&code=SC29'
    },
    SC30: {
        code: 'SC30',
        message: 'SchemaCheck: primaryKey is required',
        cause: 'The schema is missing a primary key.',
        fix: 'Define a primary key in the schema.',
        docs: 'https://rxdb.info/rx-schema.html?console=errors&code=SC30#primary-key'
    },
    SC32: {
        code: 'SC32',
        message: 'SchemaCheck: primary field must have the type string/number/integer',
        cause: 'The primary key field has an invalid type.',
        fix: 'Set the primary key type to string, number, or integer.',
        docs: 'https://rxdb.info/rx-schema.html?console=errors&code=SC32#primary-key'
    },
    SC33: {
        code: 'SC33',
        message: 'SchemaCheck: used primary key is not a property in the schema',
        cause: 'The primary key field is not defined in the properties.',
        fix: 'Add the primary key field to the properties.',
        docs: 'https://rxdb.info/rx-schema.html?console=errors&code=SC33#primary-key'
    },
    SC34: {
        code: 'SC34',
        message: 'Fields of type string that are used in an index, must have set the maxLength attribute in the schema',
        cause: 'A string field used in an index is missing the maxLength attribute.',
        fix: 'Set maxLength for the field.',
        docs: 'https://rxdb.info/rx-schema.html?console=errors&code=SC34#indexes'
    },
    SC35: {
        code: 'SC35',
        message: 'Fields of type number/integer that are used in an index, must have set the multipleOf attribute in the schema',
        cause: 'A number field used in an index is missing the multipleOf attribute.',
        fix: 'Set multipleOf for the field.',
        docs: 'https://rxdb.info/rx-schema.html?console=errors&code=SC35#indexes'
    },
    SC36: {
        code: 'SC36',
        message: 'A field of this type cannot be used as index',
        cause: 'You tried to index a field type that cannot be indexed (e.g. object, array).',
        fix: 'Remove the index or change the field type.',
        docs: 'https://rxdb.info/rx-schema.html?console=errors&code=SC36#indexes'
    },
    SC37: {
        code: 'SC37',
        message: 'Fields of type number that are used in an index, must have set the minimum and maximum attribute in the schema',
        cause: 'A number field used in an index is missing minimum/maximum attributes.',
        fix: 'Set minimum and maximum for the field.',
        docs: 'https://rxdb.info/rx-schema.html?console=errors&code=SC37#indexes'
    },
    SC38: {
        code: 'SC38',
        message: 'Fields of type boolean that are used in an index, must be required in the schema',
        cause: 'A boolean field used in an index is not marked as required.',
        fix: 'Mark the field as required.',
        docs: 'https://rxdb.info/rx-schema.html?console=errors&code=SC38#indexes'
    },
    SC39: {
        code: 'SC39',
        message: 'The primary key must have the maxLength attribute set. Ensure you use the dev-mode plugin when developing with RxDB.',
        cause: 'The primary key field is missing the maxLength attribute.',
        fix: 'Set maxLength for the primary key.',
        docs: 'https://rxdb.info/rx-schema.html?console=errors&code=SC39#primary-key'
    },
    SC40: {
        code: 'SC40',
        message: '$ref fields in the schema are not allowed. RxDB cannot resolve related schemas because it would have a negative performance impact.' +
            'It would have to run http requests on runtime. $ref fields should be resolved during build time.',
        cause: 'You used $ref in the schema, which is not supported at runtime.',
        fix: 'Resolve $ref fields during build time.',
        docs: 'https://rxdb.info/rx-schema.html?console=errors&code=SC40'
    },
    SC41: {
        code: 'SC41',
        message: 'minimum, maximum and maxLength values for indexes must be real numbers, not Infinity or -Infinity',
        cause: 'You used Infinity for min/max/maxLength.',
        fix: 'Use real numbers.',
        docs: 'https://rxdb.info/rx-schema.html?console=errors&code=SC41#indexes'
    },
    SC42: {
        code: 'SC42',
        message: 'Primary key and also indexed fields which are strings, must have a maxLength that is <= 2048. Notice that having a big maxLength can negatively affect the performance. Only set it as big as it has to be.',
        cause: 'The maxLength is too large (> 2048).',
        fix: 'Reduce the maxLength.',
        docs: 'https://rxdb.info/rx-schema.html?console=errors&code=SC42#indexes'
    },


    // plugins/dev-mode
    // removed in 13.9.0, use PL3 instead - DEV1: 'dev-mode added multiple times',
    DVM1: {
        code: 'DVM1',
        message: 'When dev-mode is enabled, your storage must use one of the schema validators at the top level. This is because most problems people have with RxDB is because they store data that is not valid to the schema which causes strange bugs and problems.',
        cause: 'The storage Adapter you use does not support schema validation.',
        fix: ' Wrap your storage with a validator like wrappedValidateAjvStorage()',
        docs: 'https://rxdb.info/rx-storage.html?console=errors&code=DVM1'
    },

    // plugins/validate.js
    VD1: {
        code: 'VD1',
        message: 'Sub-schema not found, does the schemaPath exists in your schema?',
        cause: 'You tried to validate a sub-path that does not exist in the schema.',
        fix: 'Check the schema path.',
        docs: 'https://rxdb.info/schema-validation.html?console=errors&code=VD1'
    },
    VD2: {
        code: 'VD2',
        message: 'object does not match schema',
        cause: 'RxCollection.insert()',
        fix: 'Do not store data that does not match the collections schema',
        docs: 'https://rxdb.info/schema-validation.html?console=errors&code=VD2'
    },

    // plugins/in-memory.js
    // removed in 14.0.0 - PouchDB RxStorage is removed IM1: 'InMemory: Memory-Adapter must be added. Use addPouchPlugin(require(\'pouchdb-adapter-memory\'));',
    // removed in 14.0.0 - PouchDB RxStorage is removed IM2: 'inMemoryCollection.sync(): Do not replicate with the in-memory instance. Replicate with the parent instead',

    // plugins/server.js
    S1: {
        code: 'S1',
        message: 'You cannot create collections after calling RxDatabase.server()',
        cause: 'You tried to add a collection after starting the server.',
        fix: 'Add all collections before starting the server.',
        docs: 'https://rxdb.info/server.html?console=errors&code=S1'
    },

    // plugins/replication-graphql.js
    GQL1: {
        code: 'GQL1',
        message: 'GraphQL replication: cannot find sub schema by key',
        cause: 'The GraphQL schema is missing a definition for a key.',
        fix: 'Check the GraphQL schema.',
        docs: 'https://rxdb.info/replication-graphql.html?console=errors&code=GQL1'
    },
    // removed in 13.0.0, use RC_PULL instead - GQL2: 'GraphQL replication: unknown errors occurred in replication pull - see innerErrors for more details',
    GQL3: {
        code: 'GQL3',
        message: 'GraphQL replication: pull returns more documents then batchSize',
        cause: 'The GraphQL endpoint returned more documents than requested.',
        fix: 'Check the GraphQL resolver.',
        docs: 'https://rxdb.info/replication-graphql.html?console=errors&code=GQL3'
    },
    // removed in 13.0.0, use RC_PUSH instead - GQL4: 'GraphQL replication: unknown errors occurred in replication push - see innerErrors for more details',

    // plugins/crdt/
    CRDT1: {
        code: 'CRDT1',
        message: 'CRDT operations cannot be used because the crdt options are not set in the schema.',
        cause: 'You tried to use CRDT features without enabling them in the schema.',
        fix: 'Add crdt: { field: ... } to the schema.',
        docs: 'https://rxdb.info/crdt.html?console=errors&code=CRDT1'
    },
    CRDT2: {
        code: 'CRDT2',
        message: 'RxDocument.incrementalModify() cannot be used when CRDTs are activated.',
        cause: 'CRDTs replace the need for incrementalModify.',
        fix: 'Use CRDT operations instead.',
        docs: 'https://rxdb.info/crdt.html?console=errors&code=CRDT2'
    },
    CRDT3: {
        code: 'CRDT3',
        message: 'To use CRDTs you MUST NOT set a conflictHandler because the default CRDT conflict handler must be used',
        cause: 'You defined a custom conflict handler with CRDTs.',
        fix: 'Remove the custom conflict handler.',
        docs: 'https://rxdb.info/crdt.html?console=errors&code=CRDT3'
    },

    // plugins/storage-dexie/
    DXE1: {
        code: 'DXE1',
        message: 'non-required index fields are not possible with the dexie.js RxStorage: https://github.com/pubkey/rxdb/pull/6643#issuecomment-2505310082',
        cause: 'Dexie only supports indexes on required fields.',
        fix: 'Make the indexed field required.',
        docs: 'https://rxdb.info/rx-storage-dexie.html?console=errors&code=DXE1'
    },
    // removed in 15.0.0, added boolean index support to dexie storage - DXE1: 'The dexie.js RxStorage does not support boolean indexes, see https://rxdb.info/rx-storage-dexie.html#boolean-index',

    // plugins/storage-sqlite-trial/
    SQL1: {
        code: 'SQL1',
        message: 'The trial version of the SQLite storage does not support attachments.',
        cause: 'You tried to use attachments with the trial SQLite storage.',
        fix: 'Upgrade to the full version.',
        docs: 'https://rxdb.info/rx-storage-sqlite.html?console=errors&code=SQL1'
    },
    SQL2: {
        code: 'SQL2',
        message: 'The trial version of the SQLite storage is limited to contain 300 documents',
        cause: 'You reached the document limit of the trial version.',
        fix: 'Upgrade to the full version.',
        docs: 'https://rxdb.info/rx-storage-sqlite.html?console=errors&code=SQL2'
    },
    SQL3: {
        code: 'SQL3',
        message: 'The trial version of the SQLite storage is limited to running 500 operations',
        cause: 'You reached the operation limit of the trial version.',
        fix: 'Upgrade to the full version.',
        docs: 'https://rxdb.info/rx-storage-sqlite.html?console=errors&code=SQL3'
    },


    // plugins/storage-remote
    RM1: {
        code: 'RM1',
        message: 'Cannot communicate with a remote that was build on a different RxDB version. Did you forget to rebuild your workers when updating RxDB?',
        cause: 'The RxDB version of the remote does not match the local version.',
        fix: 'Ensure both sides use the same RxDB version.',
        docs: 'https://rxdb.info/rx-storage-remote.html?console=errors&code=RM1'
    },

    // plugins/replication-mongodb
    MG1: {
        code: 'MG1',
        message: 'If _id is used as primaryKey, all documents in the MongoDB instance must have a string-value as _id, not an ObjectId or number',
        cause: 'Found a document in MongoDB where _id is not a string.',
        fix: 'Ensure all documents in MongoDB have string IDs.',
        docs: 'https://rxdb.info/replication-mongodb.html?console=errors&code=MG1'
    },

    // plugins/react
    R1: {
        code: 'R1',
        message: 'You must provide a valid RxDatabase to the the RxDatabaseProvider',
        cause: 'The database provided to the provider is invalid.',
        fix: 'Ensure you pass a valid RxDatabase instance.',
        docs: 'https://rxdb.info/react.html?console=errors&code=R1'
    },
    R2: {
        code: 'R2',
        message: 'Could not find database in context, please ensure the component is wrapped in a <RxDatabaseProvider>',
        cause: 'You tried to use the database hook outside of a provider.',
        fix: 'Wrap your component in <RxDatabaseProvider>.',
        docs: 'https://rxdb.info/react.html?console=errors&code=R2'
    },
    R3: {
        code: 'R3',
        message: 'The provided value for the collection parameter is not a valid RxCollection',
        cause: 'The collection passed to the hook is invalid.',
        fix: 'Ensure you pass a valid RxCollection instance.',
        docs: 'https://rxdb.info/react.html?console=errors&code=R3'
    },

    // plugins/replication-google-drive
    GDR1: {
        code: 'GDR1',
        message: 'Google Drive: folderPath must not be the root folder or undefined',
        cause: 'You provided "/" or "root" or "" as folderPath.',
        fix: 'Use a specific subfolder to ensure RxDB data does not mess up the users drive files.',
        docs: ''
    },
    GDR2: {
        code: 'GDR2',
        message: 'Google Drive: Folder already exists but is in trash',
        cause: 'The folder you are trying to create or access is in the trash.',
        fix: 'Restore the folder from trash or delete it permanently.',
        docs: ''
    },
    GDR3: {
        code: 'GDR3',
        message: 'Google Drive: Folder already exists but is not a folder',
        cause: 'A file with the same name already exists, but is not a folder',
        fix: 'Rename the file or the folder you are trying to create.',
        docs: ''
    },
    GDR4: {
        code: 'GDR4',
        message: 'Google Drive: Parent folder does not exist in the path hierarchy',
        cause: 'One of the parent folders in the path does not exist.',
        fix: 'Ensure the full path structure is correct.',
        docs: ''
    },
    GDR5: {
        code: 'GDR5',
        message: 'Google Drive: Conflict (409) detected but folder could not be found after reconciliation retries',
        cause: 'Concurrent creation failed and the folder is not visible yet.',
        fix: 'Check for high concurrency or eventually consistency issues.',
        docs: ''
    },
    GDR6: {
        code: 'GDR6',
        message: 'Google Drive: Failed to create file or folder',
        cause: 'The Google Drive API returned an error.',
        fix: 'Check the error details.',
        docs: ''
    },
    GDR9: {
        code: 'GDR9',
        message: 'Google Drive: folder has content but is not a rxdb sync target',
        cause: 'You selected a folder that is not empty but is not a rxdb sync target.',
        fix: 'Provide empty folder or use a different folder that is not used for anything else.',
        docs: ''
    },
    GDR10: {
        code: 'GDR10',
        message: 'Google Drive: could not delete the file',
        cause: '',
        fix: '',
        docs: ''
    },
    GDR11: {
        code: 'GDR11',
        message: 'Google Drive: could not close transaction',
        cause: '',
        fix: '',
        docs: ''
    },
    GDR12: {
        code: 'GDR12',
        message: 'Drive files.list failed',
        cause: '',
        fix: '',
        docs: ''
    },
    GDR13: {
        code: 'GDR13',
        message: 'Drive insertDocumentFiles failed',
        cause: '',
        fix: '',
        docs: ''
    },
    GDR14: {
        code: 'GDR14',
        message: 'Drive updateDocumentFiles failed',
        cause: '',
        fix: '',
        docs: ''
    },
    GDR15: {
        code: 'GDR15',
        message: 'Drive updateDocumentFiles failed',
        cause: '',
        fix: '',
        docs: ''
    },
    GDR16: {
        code: 'GDR16',
        message: 'Drive batchFetchDocumentContentsRaw failed',
        cause: '',
        fix: '',
        docs: ''
    },
    GDR17: {
        code: 'GDR17',
        message: 'Drive fetchDocumentContents failed',
        cause: '',
        fix: '',
        docs: ''
    },

    /**
     * Should never be thrown, use this for
     * null checks etc. so you do not have to increase the
     * build size with error message strings.
     */
    SNH: {
        code: 'SNH',
        message: 'This should never happen',
        cause: '',
        fix: '',
        docs: ''
    },
};

