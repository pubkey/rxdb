# RxDB Flutter example

This is an example of how to use RxDB inside of a [Flutter](https://flutter.dev/) application. It is able to insert documents and run and observe queries to create a reactive application that always renders the current database state.

**IMPORTANT:** This is highly experimental, it works but many parts are missing. If you need any missing functionality, you are expected to make a pull request.


## How it works technically

RxDB is written in TypeScript and compiled to JavaScript. To run it in a Flutter application, the [flutter_qjs](https://pub.dev/packages/flutter_qjs) library is used to spawn a QuickJS JavaScript runtime. RxDB itself run in that runtime and communicates with the flutter dart runtime. To store data persistend, the [LokiJS RxStorage](https://rxdb.info/rx-storage-lokijs.html) is used together with custom storage adapter.


## In JavaScript

To use RxDB, you have to create a compatible JavaScript file that creates your `RxDatabase` and starts some connectors which are used by Flutter to communicate with the JavaScript RxDB database.

Use the [index.js](./javascript/src/index.js) as a reference.

```js
import {
    createRxDatabase
} from 'rxdb';
import {
    getRxStorageLoki
} from 'rxdb/plugins/lokijs';
import {
    setFlutterRxDatabaseConnector,
    getLokijsAdapterFlutter
} from 'rxdb/plugins/flutter';

// do all database creation stuff in this method.
async function createDB(databaseName) {
    // create the RxDatabase
    const db = await createRxDatabase({
        // the database.name is variable so we can change it on the flutter side
        name: databaseName,
        storage: getRxStorageLoki({
            adapter: getLokijsAdapterFlutter()
        }),
        multiInstance: false
    });
    await db.addCollections({
        heroes: {
            schema: {
                version: 0,
                primaryKey: 'id',
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        maxLength: 100
                    },
                    name: {
                        type: 'string',
                        maxLength: 100
                    },
                    color: {
                        type: 'string',
                        maxLength: 30
                    }
                },
                indexes: ['name'],
                required: ['id', 'name', 'color']
            }
        }
    });
    return db;
}

// start the connector so that flutter can communicate with the JavaScript process
setFlutterRxDatabaseConnector(
    createDB
);
```


## In Flutter

## Run the example

- First you have to bundle the JavaScript by running `npm run install && npm run build` in the [/javascript](/javascript) directory.
- In your terminal, execute `flutter run` to start the example application.
