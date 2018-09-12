# Custom Build

By default, if you import RxDB into your javascript, a full batteries-included build will be imported. This has the advantage that you don't have to choose which things you need and which not. The disadvantage is the build-size. Often you don't need most of the functionality and you could save a lot of bandwidth by cherry-picking only the things you really need. For this, RxDB supports custom builds.

## Core

The core-module is the part of RxDB which is always needed to provide basic functionality. If you need a custom build, you start with the core and then add all modules that you need.

```javascript
// es6-import
import RxDB from 'rxdb/plugins/core';

// es5-require
const RxDB = require('rxdb/plugins/core');
```

## required modules

Some parts of RxDB are not in the core, but are required. This means they must always be overwrite by at least one plugin.

### validate

The validation-module does the schema-validation when you insert or update a `RxDocument`. To use RxDB you always have to add a validation-module.
This one is using [is-my-json-valid](https://www.npmjs.com/package/is-my-json-valid) but you can also use your own validator instead. To import the default validation-module, do this:

```javascript
// es6-import
import RxDBValidateModule from 'rxdb/plugins/validate';
RxDB.plugin(RxDBValidateModule);

// es5-require
RxDB.plugin(require('rxdb/plugins/validate'));
```

### ajv-validate

Another validation-module that does the schema-validation. This one is using [ajv](https://github.com/epoberezkin/ajv) as validator which is a bit faster. Better compliant to the jsonschema-standart but also has a bigger build-size.

```javascript
// es6-import
import RxDBAjvValidateModule from 'rxdb/plugins/ajv-validate';
RxDB.plugin(RxDBAjvValidateModule);

// es5-require
RxDB.plugin(require('rxdb/plugins/ajv-validate'));
```


### no-validate

A validation module that does nothing at handles all data as valid. Use this as an alternative for the normal validator when you can rely on the input of the database.
This is meant for production to reduce the build-size, do not use this in dev-mode.

```javascript
// es6-import
import RxDBNoValidateModule from 'rxdb/plugins/no-validate';
RxDB.plugin(RxDBNoValidateModule);

// es5-require
RxDB.plugin(require('rxdb/plugins/no-validate'));
```


## optional modules

Some modules are optional and only needed if you use their functionality.

### error-messages

Because error-messages are hard to compress, RxDB will throw error-codes by default. In development you should always include this plugin so full messages will be thrown.

```javascript
// es6-import
import RxDBErrorMessagesModule from 'rxdb/plugins/error-messages';
RxDB.plugin(RxDBErrorMessagesModule);

// es5-require
RxDB.plugin(require('rxdb/plugins/error-messages'));
```


### schema-check

The schemacheck-module does additional checks on your jsonschema before you create a RxCollection. This ensure that your collection-schema is correctly working with rxdb. You should always enable this plugin on dev-mode.

```javascript
// es6-import
import RxDBSchemaCheckModule from 'rxdb/plugins/schema-check';
RxDB.plugin(RxDBSchemaCheckModule);

// es5-require
RxDB.plugin(require('rxdb/plugins/schema-check'));
```

### replication

Adds the [replication](./replication.md)-functionality to RxDB.

```javascript
// es6-import
import RxDBReplicationModule from 'rxdb/plugins/replication';
RxDB.plugin(RxDBReplicationModule);

// es5-require
RxDB.plugin(require('rxdb/plugins/replication'));
```

### attachments

Adds the [attachments](./rx-attachment.md)-functionality to RxDB.

```javascript
// es6-import
import RxDBAttachmentsModule from 'rxdb/plugins/attachments';
RxDB.plugin(RxDBAttachmentsModule);

// es5-require
RxDB.plugin(require('rxdb/plugins/attachments'));
```

### in-memory

Adds the [in-memory-replication](./in-memory.md) to the collections.

```javascript
// es6-import
import RxDBInMemoryModule from 'rxdb/plugins/in-memory';
RxDB.plugin(RxDBInMemoryModule);

// es5-require
RxDB.plugin(require('rxdb/plugins/in-memory'));
```

### local-documents

Adds the [local-documents](./rx-local-document.md) to the collections and databases.

```javascript
// es6-import
import RxDBLocalDocumentsModule from 'rxdb/plugins/local-documents';
RxDB.plugin(RxDBLocalDocumentsModule);

// es5-require
RxDB.plugin(require('rxdb/plugins/local-documents'));
```

### json-dump

Adds the [json import/export](./rx-database.md#dump)-functionality to RxDB.

```javascript
// es6-import
import RxDBJsonDumpModule from 'rxdb/plugins/json-dump';
RxDB.plugin(RxDBJsonDumpModule);

// es5-require
RxDB.plugin(require('rxdb/plugins/json-dump'));
```

### key-compression

The keycompressor-module is needed when you have keyCompression enabled. This is done by default so make sure that you set [disableKeyCompression](./rx-schema.md#disablekeycompression) to `true` when you do not have this module.

```javascript
// es6-import
import RxDBKeyCompressionModule from 'rxdb/plugins/key-compression';
RxDB.plugin(RxDBKeyCompressionModule);

// es5-require
RxDB.plugin(require('rxdb/plugins/key-compression'));
```

### leader-election

The leaderelection-module is needed when want to use the leaderelection.

```javascript
// es6-import
import RxDBLeaderElectionModule from 'rxdb/plugins/leader-election';
RxDB.plugin(RxDBLeaderElectionModule);

// es5-require
RxDB.plugin(require('rxdb/plugins/leader-election'));
```

### encryption

The encryption-module is using `crypto-js` and is only needed when you create your RxDB-Database with a [password](./rx-database.md#password-optional).

```javascript
// es6-import
import RxDBEncryptionModule from 'rxdb/plugins/encryption';
RxDB.plugin(RxDBEncryptionModule);

// es5-require
RxDB.plugin(require('rxdb/plugins/encryption'));
```

### update

The update-module is only required when you use [RxDocument.update](./rx-document.md#update) or [RxQuery.update](./rx-query.md#update).

```javascript
// es6-import
import RxDBUpdateModule from 'rxdb/plugins/update';
RxDB.plugin(RxDBUpdateModule);

// es5-require
RxDB.plugin(require('rxdb/plugins/update'));
```

### watch-for-changes

When you write data on the internal pouchdb of a collection, by default the changeEvent will not be emitted to RxDB's changestream.
The watch-for-changes plugin lets you tell the collection to actively watch for changes on the pouchdb-instance whose origin is not RxDB.
This plugin is used internally by the replication-plugin and the in-memory-plugin.

```javascript
// es6-import
import RxDBWatchForChangesModule from 'rxdb/plugins/watch-for-changes';
RxDB.plugin(RxDBWatchForChangesModule);

// es5-require
RxDB.plugin(require('rxdb/plugins/watch-for-changes'));

// you can now call this once and then do writes on the pouchdb
myRxCollection.watchForChanges();

// now write sth on the pouchdb
myRxCollection.pouch.put({/* ... */});
```

### adapter-check

This module add the [checkAdapter](./rx-database.md#checkadapter)-function to RxDB.

```javascript
// es6-import
import RxDBAdapterCheckModule from 'rxdb/plugins/adapter-check';
RxDB.plugin(RxDBAdapterCheckModule);

// es5-require
RxDB.plugin(require('rxdb/plugins/adapter-check'));
```


### server
Spawns a couchdb-compatible server from a RxDatabase. Use this to replicate data from your electron-node to the browser-window. Or to fast setup a dev-environment.

See: [Tutorial: Using the RxDB Server-Plugin](./tutorials/server.md)

**Do never** expose this server to the internet, use a couchdb-instance at production.

```js

// This plugin is not included into the default RxDB-build. You have to manually add it.
import RxDBServerModule from 'rxdb/plugins/server';
RxDB.plugin(RxDBServerModule);

// es5-require
RxDB.plugin(require('rxdb/plugins/server'));
```

--------------------------------------------------------------------------------

If you are new to RxDB, you should continue [here](./plugins.md)
