# RxDB for Flutter

[RxDB](https://rxdb.info/) is a local-first, NoSQL database with observable queries and a replication protocol for any backend. This package makes RxDB usable from Dart and Flutter. You define schemas, run queries, observe results, and write your replication handlers in Dart. You do not have to write any JavaScript.

- **Observable queries**: every query, document, and count can be observed as a Dart `Stream` that emits when the data changes. Use it directly in a `StreamBuilder`.
- **SQLite storage**: data is stored in SQLite via the [sqlite3](https://pub.dev/packages/sqlite3) package on Android, iOS, macOS, Linux, and Windows.
- **Replication in Dart**: implement `pull`, `push`, and the pull stream in Dart to sync with any backend (REST, GraphQL, WebSocket, Firebase, ...).
- **Schema migration** with migration strategies written in Dart.
- **MongoDB-style (Mango) queries** with `$gt`, `$in`, `$regex`, `$or`, sorting, `skip`, and `limit`.
- **Local documents**, conflict-aware writes, bulk operations, JSON import and export.

Full documentation: [RxDB as Flutter Database](https://rxdb.info/articles/flutter-database.html)

## How it works

RxDB is written in TypeScript. This package runs the RxDB JavaScript bundle inside of QuickJS via the [fjs](https://pub.dev/packages/fjs) package. The SQL queries of the RxDB [SQLite storage](https://rxdb.info/rx-storage-sqlite.html) are executed in Dart with the sqlite3 package. Dart and JavaScript exchange JSON messages, so every RxDB feature behaves the same as in JavaScript.

By default the **SQLite trial storage** is used. It is limited to 500 stored documents and 500 operations per collection instance, which is enough to try out RxDB. For production apps, use the [RxDB Premium 👑](https://rxdb.info/premium/) SQLite storage with a custom JavaScript bundle (see below).

## Installation

```bash
flutter pub add rxdb
```

## Usage

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
          'age': {'type': 'integer'},
        },
        'required': ['id', 'name'],
      },
    ),
  },
);
final heroes = db['heroes'];

// insert
final doc = await heroes.insert({'id': 'alice', 'name': 'Alice', 'age': 30});

// query
final adults = await heroes.find({
  'selector': {
    'age': {r'$gte': 18},
  },
  'sort': [
    {'name': 'asc'},
  ],
}).exec();

// observe: emits the current result and a new one on each change
heroes.find().$.listen((docs) => print('heroes: ${docs.length}'));
heroes.count().$.listen((count) => print('count: $count'));
doc.get$('age').listen((age) => print('age: $age'));

// update
await doc.incrementalPatch({'age': 31});
await doc.incrementalUpdate({
  r'$inc': {'age': 1},
});
await doc.incrementalModify((data) {
  data['name'] = data['name'].toUpperCase();
  return data;
});

// remove
await doc.incrementalRemove();
```

Use a `StreamBuilder` to render a query result that is always up to date:

```dart
StreamBuilder<List<RxDocument>>(
  stream: heroes.find().$,
  builder: (context, snapshot) {
    final docs = snapshot.data ?? const [];
    return ListView(
      children: docs.map((doc) => ListTile(title: Text(doc.get('name')))).toList(),
    );
  },
);
```

## Replication

The [replication protocol](https://rxdb.info/replication.html) runs inside RxDB. You only implement how documents are fetched from and sent to your backend:

```dart
final replication = await heroes.replicate(
  replicationIdentifier: 'heroes-sync',
  pull: ReplicationPullOptions(
    handler: (lastCheckpoint, batchSize) async {
      final response = await api.getChangesSince(lastCheckpoint, batchSize);
      return ReplicationPullResult(documents: response.documents, checkpoint: response.checkpoint);
    },
    // optional realtime updates, for example from a WebSocket
    stream: websocketEvents.map(
      (event) => ReplicationPullStreamItem(documents: event.documents, checkpoint: event.checkpoint),
    ),
  ),
  push: ReplicationPushOptions(
    handler: (rows) async {
      // return the conflicting server states, or an empty list
      return api.push(rows.map((row) => row.toJson()).toList());
    },
  ),
);
replication.error$.listen((err) => print(err));
await replication.awaitInitialReplication();
```

## Custom JavaScript bundle

To use additional RxDB plugins or the RxDB Premium SQLite storage, build your own bundle that starts the bridge with a custom database creator and pass it as `jsBundle`:

```ts
import { createRxDatabase } from 'rxdb';
import { startRxDBFlutterBridge, getSQLiteBasicsFlutter, flutterHashSha256 } from 'rxdb/plugins/flutter';
import { getRxStorageSQLite } from 'rxdb-premium/plugins/storage-sqlite';

startRxDBFlutterBridge((databaseName) => createRxDatabase({
    name: databaseName,
    storage: getRxStorageSQLite({ sqliteBasics: getSQLiteBasicsFlutter() }),
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

## Testing

For unit tests on a machine without a device, run RxDB in Node.js and keep SQLite in memory:

```dart
final db = await createRxDatabase(
  name: 'testdb',
  runtime: NodeJsRuntime(),
  jsBundle: File('path/to/rxdb-flutter.js').readAsStringSync(),
  inMemory: true,
);
```

## Links

- [Documentation](https://rxdb.info/articles/flutter-database.html)
- [Example app](https://github.com/pubkey/rxdb/tree/master/examples/flutter)
- [GitHub](https://github.com/pubkey/rxdb)
