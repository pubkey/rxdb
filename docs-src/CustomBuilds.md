# Custom Builds

By default, if you import RxDB into your javascript, a full batteries-included build will be imported. This has the advantage that you dont have to choose which things you need and which not. The disadvantage is the build-size. Often you don't need most of the functionality and you could save a lot of bandwidth by cherry-picking only the things you really need. For this, RxDB supports custom builds.

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

## Custom plugins

Creating custom modules is very simple. You provide an object which overwrites prototypes of RxDB's internal classes.

A basic plugins:

```javascript

const myPlugin = {
        rxdb: true, // this must be true so rxdb knows that this is a rxdb-plugin and not a pouchdb-plugin
        /**
         * every value in this object can manipulate the prototype of the keynames class
         * You can manipulate every prototype in this list:
         * @link https://github.com/pubkey/rxdb/blob/cutsom-builds/src/Plugin.js
         */
        prototypes: {
            /**
             * add a function to RxCollection so you can call 'myCollection.hello()'
             *
             * @param {[type]} prototype of RxCollection
             */
            RxCollection: (proto) => {
                proto.hello = function(){
                    return 'world';
                };
            }
        },
        /**
         * some methods are static and can be overwritte in the overwriteable-object
         * @link https://github.com/pubkey/rxdb/blob/cutsom-builds/src/overwritable.js
         */
        overwritable: {
            validatePassword: function(password) {
                if (password && typeof password !== 'string' || password.length < 10)
                    throw new TypeError('password is not valid');
            }
        }
};

// now you can import the plugin
RxDB.plugin(myPlugin);
```
