import 'dart:async';

import 'collection.dart';

const _metaFields = {'_rev', '_meta', '_attachments', '_deleted'};

/// A document of a collection, see https://rxdb.info/rx-document.html
///
/// Same as in the JavaScript RxDB, a document is immutable.
/// Writes return a new [RxDocument] with the new state.
/// Use [$] to observe the document.
class RxDocument {
  final RxCollection collection;

  /// The full document data including the meta fields `_rev`, `_meta`, `_deleted` and `_attachments`.
  final Map<String, dynamic> rawData;

  RxDocument.internal(this.collection, this.rawData);

  /// The document data without meta fields.
  Map<String, dynamic> get data {
    final ret = Map<String, dynamic>.from(rawData);
    ret.removeWhere((key, _) => _metaFields.contains(key));
    return ret;
  }

  /// Same as [data], equal to `toJSON()` in JavaScript.
  Map<String, dynamic> toJson() => data;

  String get primary => rawData[collection.primaryPath] as String;
  String get revision => rawData['_rev'] as String;
  bool get deleted => rawData['_deleted'] == true;

  /// Returns the value of a field. Nested fields can be accessed with dots like `address.street`.
  dynamic get(String path) {
    dynamic current = rawData;
    for (final part in path.split('.')) {
      if (current is Map) {
        current = current[part];
      } else if (current is List) {
        final index = int.tryParse(part);
        current = index == null || index >= current.length ? null : current[index];
      } else {
        return null;
      }
    }
    return current;
  }

  dynamic operator [](String path) => get(path);

  /// Emits the latest state of the document each time it changes.
  /// Emits null when the document was deleted.
  Stream<RxDocument?> get $ => collection.findOne(primary).$;

  /// Emits the latest value of the given field each time it changes.
  Stream<dynamic> get$(String path) => $.map((doc) => doc?.get(path)).distinct();

  /// Fetches the latest state of the document.
  Future<RxDocument?> getLatest() => collection.findOne(primary).exec();

  Map<String, dynamic> get _idParams => {'id': primary};
  Map<String, dynamic> get _dataParams => {'data': rawData};

  Future<RxDocument> _write(String method, Map<String, dynamic> params) async =>
      collection.docFromJson(await collection.callJs(method, params));

  /// Sets the given fields. Fails with a conflict error when the document was changed in the meantime.
  Future<RxDocument> patch(Map<String, dynamic> patch) => _write('doc.patch', {..._dataParams, 'patch': patch});

  /// Sets the given fields on the latest state of the document.
  Future<RxDocument> incrementalPatch(Map<String, dynamic> patch) =>
      _write('doc.incrementalPatch', {..._idParams, 'patch': patch});

  /// Runs a MongoDB-like update like `{r'$inc': {'age': 1}}`.
  Future<RxDocument> update(Map<String, dynamic> updateObj) =>
      _write('doc.update', {..._dataParams, 'update': updateObj});

  Future<RxDocument> incrementalUpdate(Map<String, dynamic> updateObj) =>
      _write('doc.incrementalUpdate', {..._idParams, 'update': updateObj});

  /// Runs the Dart function [modifier] with the document data and stores the returned data.
  Future<RxDocument> modify(FutureOr<Map<String, dynamic>> Function(Map<String, dynamic> data) modifier) =>
      _withModifier(modifier, (mid) => _write('doc.modify', {..._dataParams, 'mid': mid}));

  /// Same as [modify] but runs on the latest state of the document,
  /// so it does not fail on conflicts.
  Future<RxDocument> incrementalModify(FutureOr<Map<String, dynamic>> Function(Map<String, dynamic> data) modifier) =>
      _withModifier(modifier, (mid) => _write('doc.incrementalModify', {..._idParams, 'mid': mid}));

  Future<RxDocument> _withModifier(
    FutureOr<Map<String, dynamic>> Function(Map<String, dynamic> data) modifier,
    Future<RxDocument> Function(String mid) run,
  ) async {
    final database = collection.database;
    final mid = database.registerModifier(modifier);
    try {
      return await run(mid);
    } finally {
      database.unregisterModifier(mid);
    }
  }

  /// Deletes the document. Returns the deleted state.
  Future<RxDocument> remove() => _write('doc.remove', _dataParams);

  Future<RxDocument> incrementalRemove() => _write('doc.incrementalRemove', _idParams);

  @override
  bool operator ==(Object other) =>
      other is RxDocument && other.collection == collection && other.primary == primary && other.revision == revision;

  @override
  int get hashCode => Object.hash(collection.name, primary, revision);

  @override
  String toString() => 'RxDocument(${collection.name}/$primary $revision)';
}
