# Plugins

Creating an own plugin is very simple. A plugin is basically an javascript-object which overwrites or extends RxDB's internal classes, prototypes and hooks.

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
             * @param {object} prototype of RxCollection
             */
            RxCollection: (proto) => {
                proto.hello = function(){
                    return 'world';
                };
            }
        },
        /**
         * some methods are static and can be overwritten in the overwriteable-object
         */
        overwritable: {
            validatePassword: function(password) {
                if (password && typeof password !== 'string' || password.length < 10)
                    throw new TypeError('password is not valid');
            }
        },
        /**
         * you can add hooks to the hook-list
         */
        hooks: {
            /**
             * add a foo-property to each document. You can then call myDocument.foo (='bar')
             */
            createRxDocument: function(doc) {
                doc.foo = 'bar';
            }
        }
};

// now you can import the plugin into rxdb
RxDB.plugin(myPlugin);
```

# Properties

## rxdb

The `rxdb`-property signals that this plugin is and rxdb-plugin and not a pouchdb-plugin. The value should always be `true`.

## prototypes

The `prototypes`-property contains a function for each of RxDB's internal prototype that you want to manipulate. Each function gets the prototype-object of the corresponding class as parameter and than can modify it. You can see a list of all available prototypes [here](https://github.com/pubkey/rxdb/blob/master/src/plugin.js)

## overwritable

Some of RxDB's functions are not inside of a class-prototype but are static. You can set and overwrite them with the `overwritable`-object. You can see a list of all overwriteables [here](https://github.com/pubkey/rxdb/blob/master/src/overwritable.js).

# hooks

Sometimes you don't want to overwrite an existing RxDB-method, but extend it. You can do this by adding hooks which will be called each time the code jumps into the hooks corresponding call. You can find a list of all hooks here [here](https://github.com/pubkey/rxdb/blob/master/src/hooks.js).

# options

RxDatabase and RxCollection have an additional options-parameter, which can be filled with any data required be the plugin.

```javascript
const collection = myDatabase.collection({
    name: 'foo'.
    schema: mySchema,
    options: { // anything can be passed into the options
        foo: ()=>'bar'
    }
})

// Afterwards you can use theses options in your plugin.

collection.options.foo(); // 'bar'
```

--------------------------------------------------------------------------------

If you are new to RxDB, you should continue [here](https://github.com/pubkey/rxdb/tree/master/examples)
