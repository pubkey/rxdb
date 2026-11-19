import 'change_event.dart';
import 'database.dart';
import 'document.dart';
import 'query.dart';
import 'replication.dart';

/// Result of bulk write operations like [RxCollection.bulkInsert].
class RxBulkWriteResult {
  final List<RxDocument> success;

  /// Write errors as returned by the RxStorage,
  /// for example `{status: 409, documentId: 'foo', ...}` on conflicts.
  final List<Map<String, dynamic>> error;

  RxBulkWriteResult(this.success, this.error);
}

/// A collection of documents, see https://rxdb.info/rx-collection.html
class RxCollection {
  final RxDatabase database;
  final String name;

  /// The field name of the primary key.
  final String primaryPath;

  /// The JSON schema of the collection.
  final Map<String, dynamic> schema;

  RxCollection.internal(this.database, this.name, this.primaryPath, this.schema);

  Map<String, dynamic> get _target => {'db': database.id, 'col': name};

  Future<dynamic> callJs(String method, [Map<String, dynamic> params = const {}]) {
    return database.bridge.call(method, {..._target, ...params});
  }

  /// Creates an [RxDocument] from the raw document data that the JavaScript side returns.
  RxDocument docFromJson(dynamic json) => RxDocument.internal(this, Map<String, dynamic>.from(json as Map));
  RxDocument? docFromJsonOrNull(dynamic json) => json == null ? null : docFromJson(json);

  RxBulkWriteResult _bulkResult(dynamic json) {
    final map = json as Map;
    return RxBulkWriteResult(
      (map['success'] as List).map(docFromJson).toList(),
      (map['error'] as List).map((e) => Map<String, dynamic>.from(e as Map)).toList(),
    );
  }

  Future<RxDocument> insert(Map<String, dynamic> data) async => docFromJson(await callJs('col.insert', {'data': data}));

  /// Inserts the document or returns the existing one when a document with the same primary key exists.
  Future<RxDocument> insertIfNotExists(Map<String, dynamic> data) async =>
      docFromJson(await callJs('col.insertIfNotExists', {'data': data}));

  Future<RxBulkWriteResult> bulkInsert(List<Map<String, dynamic>> docs) async =>
      _bulkResult(await callJs('col.bulkInsert', {'docs': docs}));

  Future<RxDocument> upsert(Map<String, dynamic> data) async => docFromJson(await callJs('col.upsert', {'data': data}));

  Future<RxDocument> incrementalUpsert(Map<String, dynamic> data) async =>
      docFromJson(await callJs('col.incrementalUpsert', {'data': data}));

  Future<RxBulkWriteResult> bulkUpsert(List<Map<String, dynamic>> docs) async =>
      _bulkResult(await callJs('col.bulkUpsert', {'docs': docs}));

  Future<RxBulkWriteResult> bulkRemove(List<String> ids) async =>
      _bulkResult(await callJs('col.bulkRemove', {'ids': ids}));

  /// Finds documents by a mango query like
  /// `{'selector': {'age': {r'$gt': 18}}, 'sort': [{'age': 'asc'}], 'limit': 10}`,
  /// see https://rxdb.info/rx-query.html
  RxQuery<List<RxDocument>> find([Map<String, dynamic> query = const {}]) =>
      RxQuery.internal(this, 'find', query, null, (json) => (json as List).map(docFromJson).toList());

  /// Finds a single document by its primary key or by a mango query.
  RxQuery<RxDocument?> findOne([Object? primaryKeyOrQuery]) {
    if (primaryKeyOrQuery != null && primaryKeyOrQuery is! String && primaryKeyOrQuery is! Map) {
      throw ArgumentError.value(primaryKeyOrQuery, 'primaryKeyOrQuery', 'must be a String or a Map');
    }
    final Map<String, dynamic> query;
    if (primaryKeyOrQuery is String) {
      query = {
        'selector': {primaryPath: primaryKeyOrQuery},
      };
    } else if (primaryKeyOrQuery is Map) {
      query = Map<String, dynamic>.from(primaryKeyOrQuery);
    } else {
      query = const {};
    }
    return RxQuery.internal(this, 'findOne', query, null, docFromJsonOrNull);
  }

  /// Counts the documents that match the query.
  RxQuery<int> count([Map<String, dynamic> query = const {}]) =>
      RxQuery.internal(this, 'count', query, null, (json) => (json as num).toInt());

  /// Finds documents by their primary keys. Faster than a normal query.
  RxQuery<Map<String, RxDocument>> findByIds(List<String> ids) => RxQuery.internal(
    this,
    'findByIds',
    null,
    ids,
    (json) => (json as Map).map((key, value) => MapEntry(key as String, docFromJson(value))),
  );

  /// Emits all changes to documents of the collection.
  Stream<RxChangeEvent> get $ =>
      database.bridge.observe({'kind': 'collection', ..._target}, (v) => RxChangeEvent.fromJson(v));
  Stream<RxChangeEvent> get insert$ => $.where((e) => e.operation == 'INSERT');
  Stream<RxChangeEvent> get update$ => $.where((e) => e.operation == 'UPDATE');
  Stream<RxChangeEvent> get remove$ => $.where((e) => e.operation == 'DELETE');

  Future<Map<String, dynamic>> exportJSON() async => Map<String, dynamic>.from(await callJs('col.exportJSON') as Map);
  Future<void> importJSON(Map<String, dynamic> json) => callJs('col.importJSON', {'json': json});

  /// Local documents of the collection,
  /// requires `localDocuments: true` in the [RxCollectionCreator].
  Future<Map<String, dynamic>> insertLocal(String id, Map<String, dynamic> data) async =>
      Map<String, dynamic>.from(await callJs('local.insert', {'id': id, 'data': data}) as Map);
  Future<Map<String, dynamic>> upsertLocal(String id, Map<String, dynamic> data) async =>
      Map<String, dynamic>.from(await callJs('local.upsert', {'id': id, 'data': data}) as Map);
  Future<Map<String, dynamic>?> getLocal(String id) async {
    final result = await callJs('local.get', {'id': id});
    return result == null ? null : Map<String, dynamic>.from(result as Map);
  }

  Stream<Map<String, dynamic>?> getLocal$(String id) => database.bridge.observe({
    'kind': 'local',
    ..._target,
    'id': id,
  }, (v) => v == null ? null : Map<String, dynamic>.from(v as Map));
  Future<void> removeLocal(String id) => callJs('local.remove', {'id': id});

  /// Starts a replication where the pull and push handlers are implemented in Dart,
  /// see https://rxdb.info/replication.html
  Future<RxReplicationState> replicate({
    required String replicationIdentifier,
    ReplicationPullOptions? pull,
    ReplicationPushOptions? push,
    bool live = true,
    Duration retryTime = const Duration(seconds: 5),
    bool autoStart = true,
    String deletedField = '_deleted',
    bool waitForLeadership = false,
  }) {
    return RxReplicationState.create(
      collection: this,
      replicationIdentifier: replicationIdentifier,
      pull: pull,
      push: push,
      live: live,
      retryTime: retryTime,
      autoStart: autoStart,
      deletedField: deletedField,
      waitForLeadership: waitForLeadership,
    );
  }

  /// Removes the collection and all of its documents.
  Future<void> remove() => callJs('col.remove');
}
