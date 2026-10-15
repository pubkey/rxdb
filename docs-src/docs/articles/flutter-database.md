---
title: Flutter Database with RxDB - Reactive, Local-First and SQLite
slug: flutter-database.html
description: Learn how to use RxDB as a local-first Flutter database with observable queries, SQLite storage, and replication handlers written in Dart.
image: /headers/flutter-database.jpg
---

import {Steps} from '@site/src/components/steps';

# RxDB as a Flutter Database

[RxDB](https://rxdb.info/) is a local-first, NoSQL database with observable queries and a [replication](../replication.md) protocol for any backend. With the [rxdb Dart package](https://pub.dev/packages/rxdb) you use RxDB as a **Flutter database**: you define [schemas](../rx-schema.md), run [queries](../rx-query.md), observe results as Dart streams, and implement the pull and push handlers of the replication in Dart. You do not have to write JavaScript. This page explains how the package works, how to set it up, and where its limits are.

<RxdbLogo alt="RxDB Flutter Database" />

## How RxDB Runs in Flutter

RxDB is written in TypeScript. The Dart package ships a prebuilt RxDB bundle (about `237 KB` minified) and runs it inside of QuickJS via the [fjs](https://pub.dev/packages/fjs) package, which embeds the QuickJS engine through Rust. The data is stored with the [SQLite RxStorage](../rx-storage-sqlite.md), but the SQL queries are not executed in JavaScript. They are sent to Dart and run with the [sqlite3](https://pub.dev/packages/sqlite3) package, which bundles SQLite for Android, iOS, macOS, Linux, and Windows.

Dart and JavaScript only exchange JSON strings. Each call from Dart, like `collection.insert()`, becomes a request message, and each emission of an RxJS observable, like the result of a query, becomes an event message that is added to a Dart `Stream`. Because the RxDB core is the same code as in the browser or in [React Native](../react-native-database.md), features like [EventReduce](https://github.com/pubkey/event-reduce), conflict handling, and the replication protocol behave the same.

- **Observable queries**: `find()`, `findOne()`, `count()`, and `findByIds()` return queries whose `$` is a Dart `Stream` that emits the current result and each change.
- **Documents**: `patch()`, `incrementalPatch()`, `modify()` with a Dart function, MongoDB-style `update()`, and `remove()`.
- **Replication**: `pull.handler`, `pull.stream`, and `push.handler` are Dart functions, so you can sync with any REST, GraphQL, or WebSocket backend.
- **Schema migration**: migration strategies are Dart functions, see [schema migration](../migration-schema.md).
- **Local documents**: key-value data next to your collections, see [local documents](../rx-local-document.md).

## Using RxDB in a Flutter App

<Steps>

### Install the package

```bash
flutter pub add rxdb
```

### Create the database

`createRxDatabase()` starts the JavaScript runtime, opens SQLite, and creates the collections. By default the SQLite files are stored in the application support directory.

```dart
import 'package:rxdb/rxdb.dart';

final db = await createRxDatabase(
  name: 'heroesdb',
  collections: {
    'heroes': const RxCollectionCreator(
      schema: {
        'version': 0,
        'primaryKey': 'id',
        'type': 'object',
        'properties': {
          'id': {'type': 'string', 'maxLength': 100},
          'name': {'type': 'string', 'maxLength': 100},
          'color': {'type': 'string', 'maxLength': 30},
        },
        'required': ['id', 'name', 'color'],
      },
    ),
  },
);
final heroes = db['heroes'];
```

### Write and query documents

Queries use the same MongoDB-style (Mango) syntax as in JavaScript. Notice that `$` has to be escaped in Dart strings, which is why the operators are written as raw strings like `r'$gt'`.

```dart
await heroes.insert({'id': 'a', 'name': 'Alice', 'color': 'red'});
await heroes.bulkInsert([
  {'id': 'b', 'name': 'Bob', 'color': 'blue'},
  {'id': 'c', 'name': 'Carol', 'color': 'red'},
]);

final redHeroes = await heroes.find({
  'selector': {'color': 'red'},
  'sort': [
    {'name': 'asc'},
  ],
  'limit': 10,
}).exec();

final bob = await heroes.findOne('b').exec();
await bob!.incrementalPatch({'color': 'green'});
```

### Observe the data in the UI

Each query has a `$` stream. Put it into a `StreamBuilder` and the widget re-renders when a matching document is inserted, changed, or removed. RxDB does not re-run the whole query on each write. It uses EventReduce to calculate the new result from the change event when possible.

```dart
StreamBuilder<List<RxDocument>>(
  stream: heroes.find().$,
  builder: (context, snapshot) {
    final docs = snapshot.data ?? const [];
    return ListView(
      children: docs
          .map((doc) => ListTile(
                title: Text(doc.get('name')),
                trailing: IconButton(
                  icon: const Icon(Icons.delete),
                  onPressed: () => doc.remove(),
                ),
              ))
          .toList(),
    );
  },
);
```

Same goes for counts, single documents, and single fields:

```dart
heroes.count().$.listen((count) => print('heroes: $count'));
heroes.findOne('a').$.listen((doc) => print(doc?.data));
bob!.get$('color').listen((color) => print('color: $color'));
heroes.$.listen((event) => print('${event.operation} ${event.documentId}'));
```

</Steps>

## Replication with Handlers Written in Dart

The [RxDB replication protocol](../replication.md) runs inside of the JavaScript runtime. It handles checkpoints, retries, batching, and [conflicts](../transactions-conflicts-revisions.md). You only implement how documents are fetched from and sent to your backend. This is the same contract as the [HTTP replication](../replication-http.md), but the handlers are Dart functions.

```dart
final replication = await heroes.replicate(
  replicationIdentifier: 'heroes-http-sync',
  pull: ReplicationPullOptions(
    batchSize: 50,
    handler: (lastCheckpoint, batchSize) async {
      final response = await http.get(Uri.parse(
        'https://example.com/pull'
        '?checkpoint=${jsonEncode(lastCheckpoint)}&limit=$batchSize',
      ));
      final body = jsonDecode(response.body);
      return ReplicationPullResult(
        documents: List<Map<String, dynamic>>.from(body['documents']),
        checkpoint: body['checkpoint'],
      );
    },
    // Realtime changes from the server, for example via WebSocket.
    stream: serverEvents.map((event) => ReplicationPullStreamItem(
          documents: List<Map<String, dynamic>>.from(event['documents']),
          checkpoint: event['checkpoint'],
        )),
  ),
  push: ReplicationPushOptions(
    handler: (rows) async {
      final response = await http.post(
        Uri.parse('https://example.com/push'),
        body: jsonEncode(rows.map((row) => row.toJson()).toList()),
      );
      // The server returns the master state of conflicting documents.
      return List<Map<String, dynamic>>.from(jsonDecode(response.body));
    },
  ),
);

replication.error$.listen((error) => print('replication error: $error'));
await replication.awaitInitialReplication();
```

When the client was offline and comes back, call `replication.reSync()` or emit `ReplicationPullStreamItem.resync()` on the pull stream so that the pull handler runs again. When the Dart handler throws, the error is emitted in `error$` and RxDB retries after `retryTime` (default: 5 seconds).

## Schema Migration in Dart

When you change the schema, increase its `version` and add a migration strategy for the new version. The strategy gets the old document data and returns the new data, or `null` to delete the document.

```dart
RxCollectionCreator(
  schema: heroSchemaVersion1,
  migrationStrategies: {
    1: (oldDoc) {
      oldDoc['color'] = oldDoc['color'] ?? 'unknown';
      return oldDoc;
    },
  },
);
```

## Limits of the Trial Storage

By default the package uses the free SQLite trial storage. It is meant to try out RxDB and has hard limits: it stores at most `500` documents and runs at most `500` operations per collection instance, it does not use indexes, and it does not support attachments. Reaching a limit throws the error `SQL2` or `SQL3`.

For production apps, use the [RxDB Premium 👑](/premium/) SQLite storage. Because the SQL is executed in Dart, the premium storage works with the same `getSQLiteBasicsFlutter()` adapter. Build your own JavaScript bundle and pass it to `createRxDatabase()`:

```ts
import { createRxDatabase } from 'rxdb';
import {
    startRxDBFlutterBridge,
    getSQLiteBasicsFlutter,
    flutterHashSha256
} from 'rxdb/plugins/flutter';
import { getRxStorageSQLite } from 'rxdb-premium/plugins/storage-sqlite';

startRxDBFlutterBridge((databaseName) => createRxDatabase({
    name: databaseName,
    storage: getRxStorageSQLite({
        sqliteBasics: getSQLiteBasicsFlutter()
    }),
    multiInstance: false,
    hashFunction: flutterHashSha256
}));
```

```dart
final db = await createRxDatabase(
  name: 'heroesdb',
  jsBundle: await rootBundle.loadString('assets/my-rxdb-bundle.js'),
);
```

The same approach works to add other RxDB plugins, for example [encryption](../encryption.md) or [key compression](../key-compression.md). Keep in mind that every call crosses the bridge between Dart and JavaScript as a JSON message, so reading thousands of documents at once is slower than in a pure JavaScript app. Use `limit` and observe only the data that is on screen.

## Testing Flutter Apps that Use RxDB

For unit tests on a machine without a device, run RxDB in a Node.js child process and keep SQLite in memory. The tests of the rxdb Dart package run this way in CI, and the same test suite also runs with QuickJS in a Linux desktop build of the [example app](https://github.com/pubkey/rxdb/tree/master/examples/flutter).

```dart
final db = await createRxDatabase(
  name: 'testdb',
  runtime: NodeJsRuntime(),
  jsBundle: File('path/to/rxdb-flutter.js').readAsStringSync(),
  inMemory: true,
);
```

## FAQ

<details>
<summary>Can I use RxDB in Flutter without writing JavaScript?</summary>

Yes. The rxdb Dart package ships a prebuilt JavaScript bundle and all APIs are available in Dart. Schemas, queries, migration strategies, and the [replication](../replication.md) handlers are written in Dart. You only need JavaScript when you want to add plugins or use the premium SQLite storage.

</details>

<details>
<summary>What is the best local-first database for Flutter apps?</summary>

RxDB is a good fit when you want observable queries and a sync protocol that works with your own backend. **[RxDB](../rx-database.md)** stores the data in SQLite on the device, re-renders widgets through Dart streams, and replicates with any backend through pull and push handlers. When you need a pure Dart database without a JavaScript runtime, a native SQLite wrapper is the simpler choice.

</details>

<details>
<summary>Which platforms does the RxDB Flutter package support?</summary>

Android, iOS, macOS, Linux, and Windows. Flutter Web is not supported because the package uses the native sqlite3 library and QuickJS through FFI. In a browser you can use RxDB directly with the [IndexedDB storage](../rx-storage-indexeddb.md).

</details>

<details>
<summary>Does RxDB work offline in Flutter?</summary>

Yes. All reads and writes go to the local SQLite database first, so the app works without a network connection. The [offline-first](../offline-first.md) replication pushes local changes and pulls remote changes as soon as the connection is back.

</details>

## Follow Up

- The [example Flutter app](https://github.com/pubkey/rxdb/tree/master/examples/flutter) shows a full app with a reactive list and integration tests.
- Learn the query syntax in the [RxQuery documentation](../rx-query.md).
- Read how the [Sync Engine](../replication.md) handles checkpoints and conflicts.
- Compare RxDB with other [mobile databases](./mobile-database.md) and the [React Native database](../react-native-database.md) setup.
- Start with the [RxDB Quickstart](../quickstart.md).
- If RxDB helps your project, leave a star ⭐ on [GitHub](/code/).
