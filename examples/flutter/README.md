# RxDB Flutter example

This is an example of how to use [RxDB](https://rxdb.info/) as a database inside of a [Flutter](https://flutter.dev/) application. It is able to insert documents and run and observe queries to create a reactive application that always renders the current database state.

**IMPORTANT:** This is highly experimental, it works but many parts are missing. If you need any missing functionality, you are expected to make a pull request.


## How it works technically

RxDB is written in TypeScript and compiled to JavaScript. To run it in a Flutter application, the [flutter_qjs](https://pub.dev/packages/flutter_qjs) library is used to spawn a QuickJS JavaScript runtime. RxDB itself runs in that runtime and communicates with the flutter dart runtime. To store data persistend, the [LokiJS RxStorage](https://rxdb.info/rx-storage-lokijs.html) is used together with a custom storage adapter that persists the database inside of the [shared_preferences](https://pub.dev/packages/shared_preferences) data.


## In JavaScript

To use RxDB, you have to create a compatible JavaScript file that creates your `RxDatabase` and starts some connectors which are used by Flutter to communicate with the JavaScript RxDB database via `setFlutterRxDatabaseConnector()`.

Use the [index.js](./javascript/src/index.js) as a reference.

```js
import {
    createRxDatabase
} from 'rxdb';
import {
    getRxStorageLoki
} from 'rxdb/plugins/storage-lokijs';
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

Before you can use the JavaScript code, you have to bundle it into a single `.js` file. In this example we do that with `webpack` in a npm script [here](./javascript/package.json) which bundles everything into the `javascript/dist/index.js` file.

To allow Flutter to access that file during runtime, add it to the `assets` inside of your [pubspec.yaml](./pubspec.yaml):

```yaml
flutter:
  assets:
    - javascript/dist/index.js
```

## In Flutter

First you have to use the rxdb dart package as a flutter dependency. Currently the package is not published at the dart pub.dev. Instead you have to install it from the local filesystem inside of your RxDB npm installation.

```yaml
# inside of pubspec.yaml
dependencies:
  rxdb:
    path: path/to/your/node_modules/rxdb/src/plugins/flutter/dart
```

Afterwards you can import the rxdb library in your dart code
and connect to the JavaScript process from there. For reference, check out the [lib/main.dart](./lib/main.dart) file.

```dart
import 'package:rxdb/rxdb.dart';

// start the javascript process and connect to the database
RxDatabase myDatabase = await getRxDatabase("javascript/dist/index.js", databaseName);

// get a collection
RxCollection myCollection = database.getCollection('heroes');

// insert a document
RxDocument myDocument = await collection.insert({
    "id": "zflutter-${DateTime.now()}",
    "name": nameController.text,
    "color": colorController.text
});

// create a query
RxQuery<RxHeroDocType> myQuery = RxDatabaseState.collection.find();

// subscribe to a query
myQuery.$().listen((newResults) {
    setState(() {
        documents = newResults;
    });
});
```


## Run the example

- First you have to bundle the JavaScript by running `npm run install && npm run build` in the [/javascript](/javascript) directory. You have to rerun this command each time you change the JavaScript code.
- In your terminal, execute `flutter run` to start the example application.
