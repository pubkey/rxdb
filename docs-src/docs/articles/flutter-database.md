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

RxDB is written in TypeScript. The Dart package ships a prebuilt RxDB bundle (about `241 KB` minified) and runs it inside of QuickJS via the [fjs](https://pub.dev/packages/fjs) package, which embeds the QuickJS engine through Rust. The data is stored with the [SQLite RxStorage](../rx-storage-sqlite.md), but the SQL queries are not executed in JavaScript. They are sent to Dart and run with the [sqlite3](https://pub.dev/packages/sqlite3) package, which bundles SQLite for Android, iOS, macOS, Linux, and Windows.

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

const todoSchema = {
  'version': 0,
  'primaryKey': 'id',
  'type': 'object',
  'properties': {
    'id': {'type': 'string', 'maxLength': 100},
    'name': {'type': 'string'},
    'done': {'type': 'boolean', 'default': false},
    'dueAt': {'type': 'string', 'format': 'date-time', 'maxLength': 30},
    'priority': {
      'type': 'integer',
      'minimum': 0,
      'maximum': 10,
      'multipleOf': 1,
    },
  },
  'required': ['id', 'name', 'done', 'dueAt'],
  'indexes': ['dueAt'],
};

final myDatabase = await createRxDatabase(
  name: 'mydatabase',
  collections: {
    'todos': const RxCollectionCreator(schema: todoSchema),
  },
);
final todos = myDatabase['todos'];
```

### Write and query documents

Queries use the same MongoDB-style (Mango) syntax as in JavaScript. Notice that `$` has to be escaped in Dart strings, which is why the operators are written as raw strings like `r'$gt'`.

```dart
await todos.insert({
  'id': 'todo1',
  'name': 'Learn RxDB',
  'done': false,
  'dueAt': '2026-01-01T10:00:00.000Z',
  'priority': 8,
});
await todos.bulkInsert([
  {
    'id': 'todo2',
    'name': 'Buy groceries',
    'done': true,
    'dueAt': '2026-01-02T09:30:00.000Z',
    'priority': 3,
  },
  {
    'id': 'todo3',
    'name': 'Set up replication',
    'dueAt': '2026-01-03T14:15:00.000Z',
    'priority': 10,
  },
]);

final importantTodos = await todos.find({
  'selector': {
    'priority': {r'$gte': 5},
  },
  'sort': [
    {'dueAt': 'asc'},
  ],
  'limit': 10,
}).exec();
// > [todo1, todo3]

final todo3 = await todos.findOne('todo3').exec();
await todo3!.incrementalPatch({'done': true});
```

### Observe the data in the UI

Each query has a `$` stream. Put it into a `StreamBuilder` and the widget re-renders when a matching document is inserted, changed, or removed. RxDB does not re-run the whole query on each write. It uses EventReduce to calculate the new result from the change event when possible.

```dart
StreamBuilder<List<RxDocument>>(
  stream: todos.find().$,
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
todos.count().$.listen((count) => print('todos: $count'));
todos.findOne('todo1').$.listen((doc) => print(doc?.data));
todo3.get$('done').listen((done) => print('done: $done'));
todos.$.listen((event) => print('${event.operation} ${event.documentId}'));
```

</Steps>

## Replication with Handlers Written in Dart

The [RxDB replication protocol](../replication.md) runs inside of the JavaScript runtime. It handles checkpoints, retries, batching, and [conflicts](../transactions-conflicts-revisions.md). You only implement how documents are fetched from and sent to your backend. This is the same contract as the [HTTP replication](../replication-http.md), but the handlers are Dart functions.

```dart
final replication = await todos.replicate(
  replicationIdentifier: 'todos-http-sync',
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

When you change the schema, increase its `version` and add a migration strategy for the new version. The strategy gets the old document data and returns the new data, or `null` to delete the document. Let's say version `1` of the `todoSchema` makes `priority` required:

```dart
RxCollectionCreator(
  schema: todoSchemaVersion1,
  migrationStrategies: {
    1: (oldDoc) {
      oldDoc['priority'] = oldDoc['priority'] ?? 0;
      return oldDoc;
    },
  },
);
```

## Limits of the Trial Storage

By default the package uses the free SQLite trial storage. It is meant to try out RxDB and has hard limits: it stores at most `500` documents and runs at most `500` operations per collection instance, it does not use indexes, and it does not support attachments. Reaching a limit throws the error [`SQL2`](../errors.md#SQL2) or [`SQL3`](../errors.md#SQL3).

## Switching to the RxDB Premium SQLite Storage

For production apps, switch to the [RxDB Premium <PremiumIcon />](/premium/) SQLite storage. Because the SQL is executed in Dart, the premium storage uses the same `getSQLiteBasicsFlutter()` adapter as the trial storage. The premium code cannot ship inside the public Dart package, so you build a small JavaScript bundle that contains it and point `createRxDatabase()` to that bundle. Everything else in your Dart code stays the same: schemas, queries, and replication handlers do not change. Switching storages is a configuration change, not a rewrite.

<Steps>

### Install RxDB and RxDB Premium

Create a folder like `rxdb-bundle/` next to your Flutter project and install the npm packages. The `rxdb` npm version MUST be the same as the version of the rxdb Dart package, because the bridge between Dart and JavaScript is versioned. Otherwise calls fail with the error [`FL2`](../errors.md#FL2).

```bash
npm init -y
npm install rxdb@17.6.0 rxdb-premium@17.6.0 esbuild --save-exact
```

### Start the bridge with the premium storage

Create `rxdb-bundle/index.js`. The `storage` option replaces the trial storage, all other database options are still set from Dart.

```ts
import {
    startRxDBFlutterBridge,
    getSQLiteBasicsFlutter
} from 'rxdb/plugins/flutter';
import { getRxStorageSQLite } from 'rxdb-premium/plugins/storage-sqlite';

startRxDBFlutterBridge({
    storage: getRxStorageSQLite({
        sqliteBasics: getSQLiteBasicsFlutter()
    })
});
```

### Bundle it into a Flutter asset

```bash
npx esbuild index.js --bundle --minify --format=iife \
  --platform=neutral --main-fields=module,main --target=es2020 \
  --define:process.env.NODE_ENV='"production"' \
  --outfile=../assets/rxdb-premium.js
```

Add the file to the assets in the `pubspec.yaml` of your app:

```yaml
flutter:
  assets:
    - assets/rxdb-premium.js
```

### Use the bundle in Dart

```dart
final myDatabase = await createRxDatabase(
  name: 'mydatabase',
  jsBundleAsset: 'assets/rxdb-premium.js',
  collections: {
    'todos': const RxCollectionCreator(schema: todoSchema),
  },
);
```

</Steps>

Keep in mind that the bundle has to be rebuilt each time you update the rxdb Dart package. The same approach works to add other RxDB plugins, for example [encryption](../encryption.md) or [key compression](../key-compression.md): pass a `createDatabase` function to `startRxDBFlutterBridge()` instead of `storage`, and create the database there with the plugins you need. Use `helpers.storage` as the storage and set `hashFunction: flutterHashSha256`, because QuickJS has no `crypto.subtle`. Also notice that every call crosses the bridge between Dart and JavaScript as a JSON message, so reading thousands of documents at once is slower than in a pure JavaScript app. Use `limit` and observe only the data that is on screen.

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
<summary>Can I use the RxDB Premium SQLite storage in Flutter?</summary>

Yes. Build a JavaScript bundle that calls `startRxDBFlutterBridge()` with the premium `getRxStorageSQLite()` storage and pass it to `createRxDatabase()` with `jsBundleAsset`. The premium storage uses the same `getSQLiteBasicsFlutter()` adapter, so the data is still stored with the sqlite3 package in Dart. Your **[RxDB](../rx-database.md)** code in Dart does not change.

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
