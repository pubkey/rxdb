# Custom Build

By default, if you import RxDB into your javascript, a full batteries-included build will be imported. This has the advantage that you dont have to choose which things you need and which not. The disadvantage is the build-size. Often you don't need most of the functionality and you could save a lot of bandwidth by cherry-picking only the things you really need. For this, RxDB supports custom builds.

## Core

The core-module is the part of RxDB which is always needed to provide basic functionality. If you need a custom build, you start with the core and then add all modules that you need.

```javascript
// es6-import
import RxDB from 'rxdb/plugins/core';

// es5-require
const RxDB = require('rxdb/plugins/core');
```

## required modules

Some parts of RxDB are not in the core, but are required. This means they must always be overwritte by at least one plugin.

### validate

The validation-module does the schema-validation when you insert or update a `RxDocument`. Currently we have only one validation-module, which is using [is-my-json-valid](https://www.npmjs.com/package/is-my-json-valid) but you can also use your own validator instead. To import the default validation-module, do this:

```javascript
// es6-import
import RxDBValidateModule from 'rxdb/plugins/validate';
RxDB.plugin(RxDBValidateModule);

// es5-require
RxDB.plugin(require('rxdb/plugins/validate'));
```

## optional modules

Some modules are optional and only needed if you use their functionality.

### schemacheck

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

### adapter-check

This module add the [checkAdapter](./rx-database.md#checkadapter)-function to RxDB.

```javascript
// es6-import
import RxDBAdapterCheckModule from 'rxdb/plugins/adapter-check';
RxDB.plugin(RxDBAdapterCheckModule);

// es5-require
RxDB.plugin(require('rxdb/plugins/adapter-check'));
```

--------------------------------------------------------------------------------

If you are new to RxDB, you should continue [here](./plugins.md)
