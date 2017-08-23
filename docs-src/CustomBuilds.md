# Custom Builds

By default, if you import RxDB into your javascript, a full batteries-included build will be imported. This has the advantage that you dont have to choose which things you need and which not. The disadvantage is the build-size. Often you don't need most of the functionality and you could save a lot of bandwidth by cherry-picking only the things you really need. For this, RxDB supports custom builds.

`NOTICE: Custom Builds are in beta-mode. It can happen that you have to re-adjust you build without a major rxdb-release.`

## Core

The core-module is the part of RxDB which is always needed to provide basic functionality. If you need a custom build, you start with the core and then add all modules that you need.

```javascript
// es6-import
import RxDB from 'rxdb/dist/es/core';

// es5-require (dont forget to use the 'lib'-folder instead of 'es')
const RxDB = require('rxdb/dist/lib/core');
```

## required modules

Some parts of RxDB are not in the core, but are required. This means they must always be overwritte by at least one plugin.

### validate

The validation-module does the schema-validation when you insert or update a `RxDocument`. Currently we have only one validation-module, which is using [is-my-json-valid](https://www.npmjs.com/package/is-my-json-valid) but you can also use your own validator instead. To import the default validation-module, do this:

```javascript
// es6-import
import RxDBValidateModule from 'rxdb/dist/es/modules/validate';
RxDB.plugin(RxDBValidateModule);

// es5-require (dont forget to use the 'lib'-folder instead of 'es')
RxDB.plugin(require('rxdb/dist/lib/modules/validate'));
```

## optional modules

Some modules are optional and only needed if you use their functionality.

### schemacheck

The schemacheck-module does additional checks on your jsonschema before you create a RxCollection. This ensure that your collection-schema is correctly working with rxdb. You should always enable this plugin on dev-mode.

```javascript
// es6-import
import RxDBSchemaCheckModule from 'rxdb/dist/es/modules/schemacheck';
RxDB.plugin(RxDBSchemaCheckModule);

// es5-require (dont forget to use the 'lib'-folder instead of 'es')
RxDB.plugin(require('rxdb/dist/lib/modules/schemacheck'));
```

### keycompression

The keycompressor-module is needed when you have keyCompression enabled. This is done by default so make sure that you set [disableKeyCompression](./RxSchema.html#disablekeycompression) to `true` when you do not have this module.

```javascript
// es6-import
import RxDBKeyCompressionModule from 'rxdb/dist/es/modules/keycompression';
RxDB.plugin(RxDBKeyCompressionModule);

// es5-require (dont forget to use the 'lib'-folder instead of 'es')
RxDB.plugin(require('rxdb/dist/lib/modules/keycompression'));
```

### leaderelection

The leaderelection-module is needed when want to use the leaderelection.

```javascript
// es6-import
import RxDBLeaderElectionModule from 'rxdb/dist/es/modules/leaderelection';
RxDB.plugin(RxDBLeaderElectionModule);

// es5-require (dont forget to use the 'lib'-folder instead of 'es')
RxDB.plugin(require('rxdb/dist/lib/modules/leaderelection'));
```

### encryption

The encryption-module is using `crypto-js` and is only needed when you create your RxDB-Database with a [password](./RxDatabase.md#password-optional).

```javascript
// es6-import
import RxDBEncryptionModule from 'rxdb/dist/es/modules/encryption';
RxDB.plugin(RxDBEncryptionModule);

// es5-require (dont forget to use the 'lib'-folder instead of 'es')
RxDB.plugin(require('rxdb/dist/lib/modules/encryption'));
```

### update

The update-module is only required when you use [RxDocument.update](./RxDocument.md#update) or [RxQuery.update](./RxQuery.md#update).

```javascript
// es6-import
import RxDBUpdateModule from 'rxdb/dist/es/modules/update';
RxDB.plugin(RxDBUpdateModule);

// es5-require (dont forget to use the 'lib'-folder instead of 'es')
RxDB.plugin(require('rxdb/dist/lib/modules/update'));
```

--------------------------------------------------------------------------------

If you are new to RxDB, you should continue [here](./Plugins.md)
