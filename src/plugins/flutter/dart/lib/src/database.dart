import 'dart:async';

import 'package:flutter/services.dart' show rootBundle;
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

import 'bridge.dart';
import 'change_event.dart';
import 'collection.dart';
import 'errors.dart';
import 'js_runtime.dart';
import 'replication.dart';
import 'runtime_fjs.dart';
import 'sqlite_host.dart';

/// The asset key of the RxDB JavaScript bundle that ships with this package.
const String rxdbBundleAssetKey = 'packages/rxdb/assets/rxdb-flutter.js';

/// A migration strategy migrates a document from the previous schema version.
/// Return null to delete the document.
typedef RxMigrationStrategy = FutureOr<Map<String, dynamic>?> Function(Map<String, dynamic> oldDocumentData);

/// Defines a collection, see https://rxdb.info/rx-collection.html
class RxCollectionCreator {
  /// The JSON schema of the collection, see https://rxdb.info/rx-schema.html
  final Map<String, dynamic> schema;

  /// Migration strategies by schema version,
  /// see https://rxdb.info/migration-schema.html
  final Map<int, RxMigrationStrategy> migrationStrategies;

  /// When true, the migration runs on collection creation.
  final bool autoMigrate;

  /// Enables local documents on the collection.
  final bool localDocuments;

  const RxCollectionCreator({
    required this.schema,
    this.migrationStrategies = const {},
    this.autoMigrate = true,
    this.localDocuments = false,
  });

  Map<String, dynamic> toJson() => {
    'schema': schema,
    'migrationStrategyVersions': migrationStrategies.keys.toList(),
    'autoMigrate': autoMigrate,
    'localDocuments': localDocuments,
  };
}

int _lastDatabaseId = 0;

/// Creates a new [RxDatabase].
///
/// RxDB runs inside of a JavaScript runtime and stores the data in SQLite
/// via the sqlite3 package. All methods of the database, its collections,
/// queries and documents are proxied to the JavaScript side.
///
/// - [databaseDirectory] is the folder where the SQLite files are stored.
///   Defaults to the application support directory. Use [inMemory] for tests.
/// - [runtime] is the JavaScript runtime, defaults to [FjsRuntime] (QuickJS).
/// - [jsBundle] is the JavaScript code to run. Defaults to the bundle that ships
///   with this package. Pass your own bundle when you need additional RxDB plugins
///   or the RxDB Premium SQLite storage.
Future<RxDatabase> createRxDatabase({
  required String name,
  Map<String, RxCollectionCreator> collections = const {},
  bool multiInstance = false,
  bool eventReduce = true,
  bool localDocuments = false,
  bool ignoreDuplicate = false,
  bool closeDuplicates = false,
  bool allowSlowCount = false,
  String? databaseDirectory,
  bool inMemory = false,
  RxJsRuntime? runtime,
  String? jsBundle,
  Map<String, dynamic>? options,
  RxLogHandler? onLog,
}) async {
  final bundle = jsBundle ?? await rootBundle.loadString(rxdbBundleAssetKey);
  String? directory;
  if (!inMemory) {
    directory = databaseDirectory ?? p.join((await getApplicationSupportDirectory()).path, 'rxdb');
  }
  final sqliteHost = RxSQLiteHost(directory: directory);
  final bridge = RxBridge(runtime ?? FjsRuntime(), onLog: onLog);
  sqliteHost.register(bridge);

  final dbId = 'db${_lastDatabaseId++}';
  final database = RxDatabase._(dbId, name, bridge, sqliteHost);
  database._registerHandlers();

  try {
    await bridge.start(bundle);
    final result = await bridge.call('db.create', {
      'dbId': dbId,
      'name': name,
      'multiInstance': multiInstance,
      'eventReduce': eventReduce,
      'localDocuments': localDocuments,
      'ignoreDuplicate': ignoreDuplicate,
      'closeDuplicates': closeDuplicates,
      'allowSlowCount': allowSlowCount,
      'options': options,
    });
    database.token = result['token'] as String;
    database._setCollectionsMeta(result['collections']);
    if (collections.isNotEmpty) {
      await database.addCollections(collections);
    }
  } catch (err) {
    await bridge.close();
    sqliteHost.closeAll();
    rethrow;
  }
  return database;
}

/// A RxDB database, see https://rxdb.info/rx-database.html
class RxDatabase {
  final String _id;
  final String name;
  final RxBridge bridge;
  final RxSQLiteHost sqliteHost;
  late final String token;

  final Map<String, RxCollection> _collections = {};
  final Map<String, Map<int, RxMigrationStrategy>> _migrationStrategies = {};
  final Map<String, FutureOr<Map<String, dynamic>> Function(Map<String, dynamic>)> _modifiers = {};
  final Map<String, RxReplicationState> _replications = {};
  int _lastModifierId = 0;
  bool _closed = false;

  RxDatabase._(this._id, this.name, this.bridge, this.sqliteHost);

  /// Internal id of the database on the JavaScript side.
  String get id => _id;
  bool get closed => _closed;

  Map<String, RxCollection> get collections => Map.unmodifiable(_collections);

  /// Returns the collection with the given name.
  RxCollection collection(String name) {
    final ret = _collections[name];
    if (ret == null) {
      throw RxError(code: 'FL3', message: 'Collection $name does not exist on database ${this.name}');
    }
    return ret;
  }

  RxCollection operator [](String name) => collection(name);

  void _setCollectionsMeta(dynamic meta) {
    (meta as Map).forEach((name, value) {
      final colMeta = Map<String, dynamic>.from(value as Map);
      _collections.putIfAbsent(
        name as String,
        () => RxCollection.internal(
          this,
          name,
          colMeta['primaryPath'] as String,
          Map<String, dynamic>.from(colMeta['schema'] as Map),
        ),
      );
    });
  }

  /// Adds collections to the database,
  /// see https://rxdb.info/rx-collection.html#creating-a-collection
  Future<Map<String, RxCollection>> addCollections(Map<String, RxCollectionCreator> creators) async {
    creators.forEach((name, creator) {
      _migrationStrategies[name] = creator.migrationStrategies;
    });
    final meta = await bridge.call('db.addCollections', {
      'db': _id,
      'collections': creators.map((key, value) => MapEntry(key, value.toJson())),
    });
    _setCollectionsMeta(meta);
    return {for (final name in creators.keys) name: collection(name)};
  }

  /// Emits all change events of all collections of the database.
  Stream<RxChangeEvent> get $ => bridge.observe({'kind': 'database', 'db': _id}, (v) => RxChangeEvent.fromJson(v));

  /// Exports the whole database as JSON, see https://rxdb.info/backup.html
  Future<Map<String, dynamic>> exportJSON() async =>
      Map<String, dynamic>.from(await bridge.call('db.exportJSON', {'db': _id}) as Map);

  Future<void> importJSON(Map<String, dynamic> json) => bridge.call('db.importJSON', {'db': _id, 'json': json});

  /// Local documents of the database,
  /// requires `localDocuments: true` in [createRxDatabase].
  /// See https://rxdb.info/rx-local-document.html
  Future<Map<String, dynamic>> insertLocal(String id, Map<String, dynamic> data) async =>
      Map<String, dynamic>.from(await bridge.call('local.insert', {'db': _id, 'id': id, 'data': data}) as Map);
  Future<Map<String, dynamic>> upsertLocal(String id, Map<String, dynamic> data) async =>
      Map<String, dynamic>.from(await bridge.call('local.upsert', {'db': _id, 'id': id, 'data': data}) as Map);
  Future<Map<String, dynamic>?> getLocal(String id) async {
    final result = await bridge.call('local.get', {'db': _id, 'id': id});
    return result == null ? null : Map<String, dynamic>.from(result as Map);
  }

  Stream<Map<String, dynamic>?> getLocal$(String id) => bridge.observe({
    'kind': 'local',
    'db': _id,
    'id': id,
  }, (v) => v == null ? null : Map<String, dynamic>.from(v as Map));
  Future<void> removeLocal(String id) => bridge.call('local.remove', {'db': _id, 'id': id});

  /// Closes the database and stops the JavaScript runtime.
  /// The stored data is kept.
  Future<void> close() async {
    if (_closed) {
      return;
    }
    _closed = true;
    await _cancelReplications();
    try {
      await bridge.call('db.close', {'db': _id});
    } finally {
      await bridge.close();
      sqliteHost.closeAll();
    }
  }

  /// Removes the database and all of its stored data.
  Future<void> remove() async {
    if (_closed) {
      return;
    }
    _closed = true;
    await _cancelReplications();
    try {
      await bridge.call('db.remove', {'db': _id});
    } finally {
      await bridge.close();
      sqliteHost.closeAll();
    }
  }

  Future<void> _cancelReplications() async {
    for (final replication in _replications.values.toList()) {
      await replication.cancel();
    }
  }

  /// Registers a Dart modify function that can be called from JavaScript.
  /// Returns the id of the modifier.
  String registerModifier(FutureOr<Map<String, dynamic>> Function(Map<String, dynamic>) modifier) {
    final mid = 'm${_lastModifierId++}';
    _modifiers[mid] = modifier;
    return mid;
  }

  void unregisterModifier(String mid) => _modifiers.remove(mid);

  void registerReplication(String rid, RxReplicationState state) => _replications[rid] = state;
  void unregisterReplication(String rid) => _replications.remove(rid);

  void _registerHandlers() {
    bridge.handlers['migration.run'] = (params) async {
      final strategy = _migrationStrategies[params['col']]?[params['version']];
      if (strategy == null) {
        throw RxError(
          code: 'FL3',
          message: 'No migration strategy for collection ${params['col']} version ${params['version']}',
        );
      }
      return strategy(Map<String, dynamic>.from(params['doc'] as Map));
    };
    bridge.handlers['modifier.run'] = (params) async {
      final modifier = _modifiers[params['mid']];
      if (modifier == null) {
        throw RxError(code: 'FL3', message: 'Unknown modifier ${params['mid']}');
      }
      return modifier(Map<String, dynamic>.from(params['data'] as Map));
    };
    bridge.handlers['replication.pull'] = (params) {
      final replication = _replications[params['rid']];
      if (replication == null) {
        throw RxError(code: 'FL3', message: 'Unknown replication ${params['rid']}');
      }
      return replication.runPullHandler(params['checkpoint'], params['batchSize'] as int);
    };
    bridge.handlers['replication.push'] = (params) {
      final replication = _replications[params['rid']];
      if (replication == null) {
        throw RxError(code: 'FL3', message: 'Unknown replication ${params['rid']}');
      }
      return replication.runPushHandler(params['rows'] as List);
    };
  }
}
