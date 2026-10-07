import 'collection.dart';

/// A query on a collection, see https://rxdb.info/rx-query.html
///
/// [R] is the result type: a list of documents for `find()`,
/// a nullable document for `findOne()`, an int for `count()`
/// and a map for `findByIds()`.
class RxQuery<R> {
  final RxCollection collection;

  /// One of find, findOne, count, findByIds.
  final String op;

  /// The mango query, see https://rxdb.info/rx-query.html#mango-query
  final Map<String, dynamic>? mangoQuery;
  final List<String>? ids;
  final R Function(dynamic json) _mapResult;

  RxQuery.internal(this.collection, this.op, this.mangoQuery, this.ids, this._mapResult);

  Map<String, dynamic> get _params => {
    'op': op,
    if (mangoQuery != null) 'query': mangoQuery,
    if (ids != null) 'ids': ids,
  };

  /// Runs the query once.
  Future<R> exec() async => _mapResult(await collection.callJs('query.exec', _params));

  /// Emits the current result and then a new result each time it changes.
  /// Uses the EventReduce algorithm of RxDB on the JavaScript side.
  Stream<R> get $ => collection.database.bridge.observe({
    'kind': 'query',
    'db': collection.database.id,
    'col': collection.name,
    ..._params,
  }, _mapResult);

  /// Removes all documents that match the query.
  Future<R> remove() async => _mapResult(await collection.callJs('query.remove', _params));

  /// Sets the given fields on all matching documents.
  Future<R> patch(Map<String, dynamic> patch) async =>
      _mapResult(await collection.callJs('query.patch', {..._params, 'patch': patch}));

  Future<R> incrementalPatch(Map<String, dynamic> patch) async =>
      _mapResult(await collection.callJs('query.incrementalPatch', {..._params, 'patch': patch}));

  /// Runs a MongoDB-like update on all matching documents, like `{r'$inc': {'age': 1}}`,
  /// see https://rxdb.info/rx-document.html#update
  Future<R> update(Map<String, dynamic> updateObj) async =>
      _mapResult(await collection.callJs('query.update', {..._params, 'update': updateObj}));
}
