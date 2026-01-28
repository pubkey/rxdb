---
title: Supercharge Flutter Apps with the RxDB Database
slug: flutter-database.html
description: Harness RxDB's reactive database to bring real-time, offline-first data storage and syncing to your next Flutter application.
---


# RxDB as a Database in a Flutter Application

In the world of mobile application development, Flutter has gained significant popularity due to its cross-platform capabilities and rich UI framework. When it comes to building feature-rich Flutter applications, the choice of a robust and efficient database is crucial. In this article, we will explore [RxDB](https://rxdb.info/) as a database solution for Flutter applications. We'll delve into the core features of RxDB, its benefits over other database options, and how to integrate it into a Flutter app.


:::note
You can find the source code for an example RxDB Flutter Application [at the github repo](https://github.com/pubkey/rxdb/tree/master/examples/flutter)
:::

<center>
    <a href="https://rxdb.info/">
        <img src="../files/logo/rxdb_javascript_database.svg" alt="RxDB Flutter Database" width="220" />
    </a>
</center>


### Overview of Flutter Mobile Applications
Flutter is an open-source UI software development kit created by Google that allows developers to build high-performance [mobile](./mobile-database.md) applications for iOS and Android platforms using a single codebase. Flutter's framework provides a wide range of widgets and tools that enable developers to create visually appealing and responsive applications.


<center>
        <img src="../files/icons/flutter.svg" alt="Flutter" width="60" />
</center>

### Importance of Databases in Flutter Applications
Databases play a vital role in Flutter applications by providing a persistent and reliable storage solution for storing and retrieving data. Whether it's user profiles, app settings, or complex data structures, a database helps in efficiently managing and organizing the application's data. Choosing the right database for a Flutter application can significantly impact the performance, scalability, and user experience of the app.

### Introducing RxDB as a Database Solution
RxDB is a powerful NoSQL database solution that is designed to work seamlessly with JavaScript-based frameworks, such as Flutter. It stands for Reactive Database and offers a variety of features that make it an excellent choice for building Flutter applications. RxDB combines the simplicity of JavaScript's document-based database model with the reactive programming paradigm, enabling developers to build real-time and offline-first applications with ease.

## Getting Started with RxDB
To understand how RxDB can be utilized in a Flutter application, let's explore its core features and advantages.

### What is RxDB?
[RxDB](https://rxdb.info/) is a client-side database built on top of [IndexedDB](../rx-storage-indexeddb.md), which is a low-level [browser-based database](./browser-database.md) API. It provides a simple and intuitive API for performing CRUD operations (Create, Read, Update, Delete) on documents. RxDB's underlying architecture allows for efficient handling of data synchronization between multiple clients and servers.

<center>
    <a href="https://rxdb.info/">
        <img src="../files/logo/rxdb_javascript_database.svg" alt="RxDB Flutter Database" width="220" />
    </a>
</center>


### Reactive Data Handling
One of the key strengths of RxDB is its reactive data handling. It leverages the power of Observables, a concept from reactive programming, to automatically update the UI in response to data changes. With RxDB, developers can define queries and subscribe to their results, ensuring that the UI is always in sync with the database.

### Offline-First Approach
RxDB follows an offline-first approach, making it ideal for building Flutter applications that need to function even without an internet connection. It allows data to be stored locally and seamlessly synchronizes it with the server when a connection is available. This ensures that users can access and interact with their data regardless of network availability.

### Data Replication
Data replication is a critical aspect of building distributed applications. RxDB provides robust replication capabilities that enable synchronization of data between different clients and servers. With its replication plugins, RxDB simplifies the process of setting up real-time data synchronization, ensuring consistency across all connected devices.

### [Observable Queries](../rx-query.md)
RxDB introduces the concept of observable queries, which are queries that automatically update when the underlying data changes. This feature is particularly useful for keeping the UI up to date with the latest data. By subscribing to an observable query, developers can receive real-time updates and reflect them in the user interface without manual intervention.

### RxDB vs. Other Flutter Database Options
When considering database options for Flutter applications, developers often come across alternatives such as SQLite or LokiJS. While these databases have their merits, RxDB offers several advantages over them. RxDB's seamless integration with Flutter, its offline-first approach, reactive data handling, and built-in data replication make it a compelling choice for building feature-rich and scalable Flutter applications.

## Using RxDB in a Flutter Application
Now that we understand the core features of RxDB, let's explore how to integrate it into a Flutter application.

## How RxDB can run in Flutter

RxDB is written in TypeScript and compiled to JavaScript. To run it in a Flutter application, the `flutter_qjs` library is used to spawn a QuickJS JavaScript runtime. RxDB itself runs in that runtime and communicates with the flutter dart runtime. To store data persistent, the [LokiJS RxStorage](../rx-storage-lokijs.md) is used together with a custom storage adapter that persists the database inside of the `shared_preferences` data.

To use RxDB, you have to create a compatible JavaScript file that creates your RxDatabase and starts some connectors which are used by Flutter to communicate with the JavaScript RxDB database via setFlutterRxDatabaseConnector().

```javascript
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

Before you can use the JavaScript code, you have to bundle it into a single .js file. In this example we do that with webpack in a npm script here which bundles everything into the `javascript/dist/index.js` file.

To allow Flutter to access that file during runtime, add it to the assets inside of your pubspec.yaml:

```yaml
flutter:
  assets:
    - javascript/dist/index.js
```


Also you need to install RxDB in your flutter part of the application. First you have to use the rxdb dart package as a flutter dependency. Currently the package is not published at the dart pub.dev. Instead you have to install it from the local filesystem inside of your RxDB npm installation.

```yaml
# inside of pubspec.yaml
dependencies:
  rxdb:
    path: path/to/your/node_modules/rxdb/src/plugins/flutter/dart
```

Afterwards you can import the rxdb library in your dart code and connect to the JavaScript process from there. For reference, check out the lib/main.dart file.

```dart
import 'package:rxdb/rxdb.dart';

// start the javascript process and connect to the database
RxDatabase database = await getRxDatabase("javascript/dist/index.js", databaseName);

// get a collection
RxCollection collection = database.getCollection('heroes');

// insert a document
RxDocument document = await collection.insert({
    "id": "zflutter-${DateTime.now()}",
    "name": nameController.text,
    "color": colorController.text
});

// create a query
RxQuery<RxHeroDocType> query = RxDatabaseState.collection.find();

// create list to store query results
List<RxDocument<RxHeroDocType>> documents = [];

// subscribe to a query
query.$().listen((results) {
    setState(() {
        documents = results;
    });
});
```


### Different RxStorage layers for RxDB
RxDB offers multiple storage options, known as RxStorage layers, to store data locally. These options include:

- [LokiJS RxStorage](../rx-storage-lokijs.md): LokiJS is an in-memory database that can be used as a [storage](./browser-storage.md) layer for RxDB. It provides fast and efficient in-memory data management capabilities.
- [SQLite RxStorage](../rx-storage-sqlite.md): SQLite is a popular and widely used [embedded database](./embedded-database.md) that offers robust storage capabilities. RxDB utilizes SQLite as a storage layer to persist data on the device.
- [Memory RxStorage](../rx-storage-memory.md): As the name suggests, Memory RxStorage stores data [in memory](./in-memory-nosql-database.md). While this option does not provide persistence, it can be useful for temporary or cache-based data storage.
By choosing the appropriate RxStorage layer based on the specific requirements of the application, developers can optimize performance and storage efficiency.

## Synchronizing Data with RxDB between Clients and Servers
One of the key strengths of RxDB is its ability to synchronize data between multiple clients and servers seamlessly. Let's explore how this synchronization can be achieved.

### Offline-First Approach
RxDB's offline-first approach ensures that data can be accessed and modified even when there is no internet connection. Changes made offline are automatically synchronized with the server once a connection is reestablished. This ensures data consistency across all devices, providing a seamless user experience.

### RxDB Replication Plugins
RxDB provides replication plugins that simplify the process of setting up data [synchronization between clients and servers](../replication.md). These plugins offer various synchronization strategies, such as one-way replication, two-way replication, and conflict resolution mechanisms. By configuring the appropriate replication plugin, developers can easily establish real-time data synchronization in their Flutter applications.

## Advanced RxDB Features and Techniques
RxDB offers a range of advanced features and techniques that enhance its functionality and performance. Let's explore a few of these features:

### Indexing and Performance Optimization
Indexing is a technique used to optimize query performance by creating indexes on specific fields. RxDB allows developers to define indexes on document fields, improving the efficiency of queries and data retrieval.

### Encryption of Local Data
To ensure data privacy and security, RxDB supports [encryption of local data](../encryption.md). By encrypting the data stored on the device, developers can protect sensitive information and prevent unauthorized access.

### Change Streams and Event Handling
RxDB provides change streams, which emit events whenever data changes occur. By leveraging change streams, developers can implement custom event handling logic, such as updating the UI or triggering background processes, in response to specific data changes.

### JSON Key Compression
To minimize storage requirements and optimize performance, RxDB offers [JSON key compression](../key-compression.md). This feature reduces the size of keys used in the database, resulting in more efficient storage and improved query performance.

## Conclusion
RxDB offers a powerful and flexible database solution for Flutter applications. With its offline-first approach, real-time data synchronization, and reactive data handling capabilities, RxDB simplifies the development of feature-rich and scalable Flutter applications. By integrating RxDB into your Flutter projects, you can leverage its advanced features and techniques to build responsive and data-driven applications that provide an exceptional user experience.

:::note
You can find the source code for an example RxDB Flutter Application [at the github repo](https://github.com/pubkey/rxdb/tree/master/examples/flutter)
:::
