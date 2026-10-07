import 'dart:io';

import 'package:rxdb/rxdb.dart';

/// The tests run with Node.js by default. The integration tests of the
/// example app set these to run the same tests on QuickJS (fjs).
RxJsRuntime Function() createTestRuntime = () => NodeJsRuntime();
Future<String> Function() loadTestBundle = () => File('assets/rxdb-flutter.js').readAsString();

int _dbCount = 0;
String randomDatabaseName() => 'testdb${DateTime.now().microsecondsSinceEpoch}x${_dbCount++}';

final Map<String, dynamic> heroSchema = {
  'version': 0,
  'primaryKey': 'id',
  'type': 'object',
  'properties': {
    'id': {'type': 'string', 'maxLength': 100},
    'name': {'type': 'string', 'maxLength': 100},
    'color': {'type': 'string', 'maxLength': 30},
    'age': {'type': 'integer', 'minimum': 0, 'maximum': 200, 'multipleOf': 1},
    'address': {
      'type': 'object',
      'properties': {
        'street': {'type': 'string'},
      },
    },
  },
  'required': ['id', 'name'],
  'indexes': ['name'],
};

/// Creates a database that by default runs RxDB in a Node.js child process,
/// so the tests can run on a CI server without a device.
Future<RxDatabase> createTestDatabase({
  String? name,
  Map<String, RxCollectionCreator>? collections,
  String? directory,
  bool localDocuments = false,
}) async {
  return createRxDatabase(
    name: name ?? randomDatabaseName(),
    collections: collections ?? {'heroes': RxCollectionCreator(schema: heroSchema)},
    runtime: createTestRuntime(),
    jsBundle: await loadTestBundle(),
    inMemory: directory == null,
    databaseDirectory: directory,
    localDocuments: localDocuments,
    onLog: (level, message) {
      if (!message.contains('trial')) {
        // ignore: avoid_print
        print('[js:$level] $message');
      }
    },
  );
}

Map<String, dynamic> hero(String id, {String? name, String color = 'red', int age = 20}) => {
  'id': id,
  'name': name ?? 'name-$id',
  'color': color,
  'age': age,
};
