import 'dart:async';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:rxdb/rxdb.dart';

import 'helper.dart';

/// Waits until the stream emits a value that matches the predicate.
Future<T> waitFor<T>(Stream<T> stream, bool Function(T value) predicate) {
  return stream.firstWhere(predicate).timeout(const Duration(seconds: 10));
}

void main() {
  group('database', () {
    test('create and close', () async {
      final db = await createTestDatabase();
      expect(db.collections.keys, contains('heroes'));
      expect(db.collection('heroes').primaryPath, 'id');
      expect(db.bridge.jsVersion, isNotEmpty);
      await db.close();
      expect(db.closed, isTrue);
    });
    test('accessing a non existing collection throws', () async {
      final db = await createTestDatabase();
      expect(() => db.collection('foobar'), throwsA(isA<RxError>()));
      await db.close();
    });
    test('addCollections() after creation', () async {
      final db = await createTestDatabase();
      final cols = await db.addCollections({'villains': RxCollectionCreator(schema: heroSchema)});
      await cols['villains']!.insert(hero('a'));
      expect(await db['villains'].count().exec(), 1);
      await db.close();
    });
    test('persists data on disk after closing', () async {
      final dir = await Directory.systemTemp.createTemp('rxdb-dart-test-');
      final name = randomDatabaseName();
      final db = await createTestDatabase(name: name, directory: dir.path);
      await db['heroes'].insert(hero('alice'));
      await db.close();

      final db2 = await createTestDatabase(name: name, directory: dir.path);
      final doc = await db2['heroes'].findOne('alice').exec();
      expect(doc, isNotNull);
      expect(doc!.get('name'), 'name-alice');
      await db2.close();
      await dir.delete(recursive: true);
    });
    test('remove() deletes the data', () async {
      final dir = await Directory.systemTemp.createTemp('rxdb-dart-test-');
      final name = randomDatabaseName();
      final db = await createTestDatabase(name: name, directory: dir.path);
      await db['heroes'].insert(hero('alice'));
      await db.remove();

      final db2 = await createTestDatabase(name: name, directory: dir.path);
      expect(await db2['heroes'].count().exec(), 0);
      await db2.close();
      await dir.delete(recursive: true);
    });
    test('exportJSON() and importJSON()', () async {
      final db = await createTestDatabase();
      await db['heroes'].bulkInsert([hero('a'), hero('b')]);
      final json = await db['heroes'].exportJSON();
      expect((json['docs'] as List).length, 2);

      final db2 = await createTestDatabase();
      await db2['heroes'].importJSON(json);
      expect(await db2['heroes'].count().exec(), 2);
      await db.close();
      await db2.close();
    });
  });

  group('collection writes', () {
    late RxDatabase db;
    late RxCollection heroes;
    setUp(() async {
      db = await createTestDatabase();
      heroes = db['heroes'];
    });
    tearDown(() => db.close());

    test('insert()', () async {
      final doc = await heroes.insert(hero('alice', age: 30));
      expect(doc.primary, 'alice');
      expect(doc.get('age'), 30);
      expect(doc.revision, startsWith('1-'));
      expect(doc.deleted, isFalse);
      expect(doc.data.containsKey('_rev'), isFalse);
      expect(doc.rawData.containsKey('_rev'), isTrue);
    });
    test('insert() with the same primary key throws a conflict', () async {
      await heroes.insert(hero('alice'));
      try {
        await heroes.insert(hero('alice'));
        fail('must throw');
      } on RxError catch (err) {
        expect(err.code, 'CONFLICT');
        expect(err.isConflict, isTrue);
      }
    });
    test('insertIfNotExists()', () async {
      await heroes.insert(hero('alice', color: 'red'));
      final doc = await heroes.insertIfNotExists(hero('alice', color: 'blue'));
      expect(doc.get('color'), 'red');
    });
    test('bulkInsert() returns success and errors', () async {
      await heroes.insert(hero('a'));
      final result = await heroes.bulkInsert([hero('a'), hero('b'), hero('c')]);
      expect(result.success.map((d) => d.primary), containsAll(['b', 'c']));
      expect(result.error.length, 1);
      expect(result.error.first['status'], 409);
      expect(result.error.first['documentId'], 'a');
    });
    test('upsert() and incrementalUpsert()', () async {
      await heroes.upsert(hero('a', color: 'red'));
      final doc = await heroes.upsert(hero('a', color: 'blue'));
      expect(doc.get('color'), 'blue');
      final doc2 = await heroes.incrementalUpsert(hero('a', color: 'green'));
      expect(doc2.get('color'), 'green');
      expect(await heroes.count().exec(), 1);
    });
    test('bulkUpsert() and bulkRemove()', () async {
      await heroes.bulkUpsert([hero('a'), hero('b'), hero('c')]);
      expect(await heroes.count().exec(), 3);
      final result = await heroes.bulkRemove(['a', 'b']);
      expect(result.success.length, 2);
      expect(result.success.every((d) => d.deleted), isTrue);
      expect(await heroes.count().exec(), 1);
    });
    test('remove() the collection', () async {
      await heroes.insert(hero('a'));
      await heroes.remove();
      final cols = await db.addCollections({'heroes': RxCollectionCreator(schema: heroSchema)});
      expect(await cols['heroes']!.count().exec(), 0);
    });
  });

  group('queries', () {
    late RxDatabase db;
    late RxCollection heroes;
    setUp(() async {
      db = await createTestDatabase();
      heroes = db['heroes'];
      await heroes.bulkInsert([
        hero('a', name: 'Alice', age: 30, color: 'red'),
        hero('b', name: 'Bob', age: 20, color: 'blue'),
        hero('c', name: 'Carol', age: 40, color: 'red'),
        hero('d', name: 'Dave', age: 10, color: 'green'),
      ]);
    });
    tearDown(() => db.close());

    test('find() with selector, sort, skip and limit', () async {
      final result = await heroes.find({
        'selector': {
          'age': {r'$gt': 15},
        },
        'sort': [
          {'age': 'desc'},
        ],
        'skip': 1,
        'limit': 2,
      }).exec();
      expect(result.map((d) => d.primary).toList(), ['a', 'b']);
    });
    test('find() with \$or and \$regex', () async {
      final result = await heroes.find({
        'selector': {
          r'$or': [
            {'color': 'green'},
            {
              'name': {r'$regex': '^Ca'},
            },
          ],
        },
        'sort': [
          {'id': 'asc'},
        ],
      }).exec();
      expect(result.map((d) => d.primary).toList(), ['c', 'd']);
    });
    test('findOne() by primary key and by query', () async {
      expect((await heroes.findOne('b').exec())!.get('name'), 'Bob');
      expect(await heroes.findOne('unknown').exec(), isNull);
      final oldest = await heroes.findOne({
        'selector': {},
        'sort': [
          {'age': 'desc'},
        ],
      }).exec();
      expect(oldest!.primary, 'c');
    });
    test('count()', () async {
      expect(await heroes.count().exec(), 4);
      expect(
        await heroes.count({
          'selector': {'color': 'red'},
        }).exec(),
        2,
      );
    });
    test('findByIds()', () async {
      final result = await heroes.findByIds(['a', 'd', 'unknown']).exec();
      expect(result.keys.toSet(), {'a', 'd'});
      expect(result['d']!.get('name'), 'Dave');
    });
    test('query.remove()', () async {
      await heroes.find({
        'selector': {'color': 'red'},
      }).remove();
      expect(await heroes.count().exec(), 2);
    });
    test('query.patch() and query.update()', () async {
      await heroes
          .find({
            'selector': {'color': 'red'},
          })
          .patch({'color': 'orange'});
      expect(
        await heroes.count({
          'selector': {'color': 'orange'},
        }).exec(),
        2,
      );
      await heroes.find().update({
        r'$inc': {'age': 1},
      });
      expect((await heroes.findOne('d').exec())!.get('age'), 11);
    });
  });

  group('observing', () {
    late RxDatabase db;
    late RxCollection heroes;
    setUp(() async {
      db = await createTestDatabase();
      heroes = db['heroes'];
    });
    tearDown(() => db.close());

    test('query.\$ emits the current and all new results', () async {
      final emitted = <List<String>>[];
      final sub = heroes
          .find({
            'selector': {'color': 'red'},
            'sort': [
              {'id': 'asc'},
            ],
          })
          .$
          .listen((docs) => emitted.add(docs.map((d) => d.primary).toList()));

      await waitForCondition(() => emitted.isNotEmpty);
      expect(emitted.last, isEmpty);

      await heroes.insert(hero('a', color: 'red'));
      await waitForCondition(() => emitted.last.length == 1);

      await heroes.insert(hero('b', color: 'blue'));
      await heroes.insert(hero('c', color: 'red'));
      await waitForCondition(() => emitted.last.length == 2);
      expect(emitted.last, ['a', 'c']);

      final a = await heroes.findOne('a').exec();
      await a!.patch({'color': 'blue'});
      await waitForCondition(() => emitted.last.length == 1);
      expect(emitted.last, ['c']);

      await sub.cancel();
    });
    test('count().\$ and findOne().\$', () async {
      final counts = <int>[];
      final docs = <RxDocument?>[];
      final sub1 = heroes.count().$.listen(counts.add);
      final sub2 = heroes.findOne('a').$.listen(docs.add);
      await waitForCondition(() => counts.isNotEmpty && docs.isNotEmpty);
      expect(counts.last, 0);
      expect(docs.last, isNull);

      await heroes.insert(hero('a'));
      await waitForCondition(() => counts.last == 1 && docs.last != null);

      await (await heroes.findOne('a').exec())!.remove();
      await waitForCondition(() => counts.last == 0 && docs.last == null);
      await sub1.cancel();
      await sub2.cancel();
    });
    test('doc.\$ and doc.get\$()', () async {
      final doc = await heroes.insert(hero('a', age: 1));
      final ages = <dynamic>[];
      final sub = doc.get$('age').listen(ages.add);
      await waitForCondition(() => ages.contains(1));
      await doc.incrementalPatch({'age': 2});
      await doc.incrementalPatch({'age': 3});
      await waitForCondition(() => ages.contains(3));
      expect(ages, [1, 2, 3]);
      await sub.cancel();
    });
    test('collection.\$ emits change events', () async {
      final events = <RxChangeEvent>[];
      final sub = heroes.$.listen(events.add);
      // wait until the subscription is running on the JavaScript side
      await Future<void>.delayed(const Duration(milliseconds: 200));
      final doc = await heroes.insert(hero('a'));
      final doc2 = await doc.patch({'color': 'blue'});
      await doc2.remove();
      await waitForCondition(() => events.length == 3);
      expect(events.map((e) => e.operation).toList(), ['INSERT', 'UPDATE', 'DELETE']);
      expect(events.first.documentId, 'a');
      expect(events.first.collectionName, 'heroes');
      expect(events[1].documentData!['color'], 'blue');
      await sub.cancel();
    });
    test('database.\$ emits change events of all collections', () async {
      final events = <RxChangeEvent>[];
      final sub = db.$.listen(events.add);
      await Future<void>.delayed(const Duration(milliseconds: 200));
      await heroes.insert(hero('a'));
      await waitForCondition(() => events.isNotEmpty);
      expect(events.first.operation, 'INSERT');
      await sub.cancel();
    });
    test('a stream can be listened to multiple times', () async {
      final stream = heroes.count().$;
      expect(await stream.first, 0);
      await heroes.insert(hero('a'));
      expect(await waitFor(stream, (c) => c == 1), 1);
    });
  });

  group('documents', () {
    late RxDatabase db;
    late RxCollection heroes;
    setUp(() async {
      db = await createTestDatabase();
      heroes = db['heroes'];
    });
    tearDown(() => db.close());

    test('patch() on an outdated document throws a conflict', () async {
      final doc = await heroes.insert(hero('a'));
      await doc.patch({'color': 'blue'});
      try {
        await doc.patch({'color': 'green'});
        fail('must throw');
      } on RxError catch (err) {
        expect(err.isConflict, isTrue);
      }
      final latest = await doc.getLatest();
      expect(latest!.get('color'), 'blue');
    });
    test('incrementalPatch() on an outdated document works', () async {
      final doc = await heroes.insert(hero('a'));
      await doc.patch({'color': 'blue'});
      final newDoc = await doc.incrementalPatch({'color': 'green'});
      expect(newDoc.get('color'), 'green');
      expect(newDoc.revision, startsWith('3-'));
    });
    test('modify() and incrementalModify() run Dart functions', () async {
      final doc = await heroes.insert(hero('a', age: 5));
      final doc2 = await doc.modify((data) {
        expect(data.containsKey('_rev'), isFalse);
        data['age'] = (data['age'] as int) + 10;
        return data;
      });
      expect(doc2.get('age'), 15);
      final doc3 = await doc.incrementalModify((data) async {
        await Future<void>.delayed(const Duration(milliseconds: 10));
        data['name'] = 'modified';
        return data;
      });
      expect(doc3.get('name'), 'modified');
      expect(doc3.get('age'), 15);
    });
    test('update() with mongo update operators', () async {
      final doc = await heroes.insert(hero('a', age: 5));
      final doc2 = await doc.update({
        r'$inc': {'age': 2},
        r'$set': {'address.street': 'Main Street'},
      });
      expect(doc2.get('age'), 7);
      expect(doc2.get('address.street'), 'Main Street');
      final doc3 = await doc.incrementalUpdate({
        r'$inc': {'age': 1},
      });
      expect(doc3.get('age'), 8);
    });
    test('remove() and incrementalRemove()', () async {
      final a = await heroes.insert(hero('a'));
      final b = await heroes.insert(hero('b'));
      final removed = await a.remove();
      expect(removed.deleted, isTrue);
      await b.incrementalRemove();
      expect(await heroes.count().exec(), 0);
    });
    test('equality by primary and revision', () async {
      final doc = await heroes.insert(hero('a'));
      final same = await heroes.findOne('a').exec();
      expect(same, equals(doc));
      final changed = await doc.patch({'color': 'blue'});
      expect(changed, isNot(equals(doc)));
    });
  });

  group('local documents', () {
    test('on the database', () async {
      final db = await createTestDatabase(localDocuments: true);
      final values = <Map<String, dynamic>?>[];
      final sub = db.getLocal$('settings').listen(values.add);
      await waitForCondition(() => values.isNotEmpty);
      expect(values.last, isNull);

      await db.insertLocal('settings', {'theme': 'dark'});
      expect((await db.getLocal('settings'))!['theme'], 'dark');
      await db.upsertLocal('settings', {'theme': 'light'});
      await waitForCondition(() => values.last?['theme'] == 'light');
      await db.removeLocal('settings');
      expect(await db.getLocal('settings'), isNull);
      await sub.cancel();
      await db.close();
    });
    test('on a collection', () async {
      final db = await createTestDatabase(
        collections: {'heroes': RxCollectionCreator(schema: heroSchema, localDocuments: true)},
      );
      await db['heroes'].upsertLocal('cursor', {'position': 5});
      expect((await db['heroes'].getLocal('cursor'))!['position'], 5);
      await db.close();
    });
  });

  group('migration', () {
    test('migrates documents with a Dart migration strategy', () async {
      final dir = await Directory.systemTemp.createTemp('rxdb-dart-test-');
      final name = randomDatabaseName();
      final db = await createTestDatabase(name: name, directory: dir.path);
      await db['heroes'].bulkInsert([hero('a', age: 1), hero('b', age: 2)]);
      await db.close();

      final schemaV1 = Map<String, dynamic>.from(heroSchema);
      schemaV1['version'] = 1;
      final db2 = await createTestDatabase(
        name: name,
        directory: dir.path,
        collections: {
          'heroes': RxCollectionCreator(
            schema: schemaV1,
            migrationStrategies: {
              1: (oldDoc) {
                if (oldDoc['id'] == 'b') {
                  return null;
                }
                oldDoc['age'] = (oldDoc['age'] as int) * 100;
                return oldDoc;
              },
            },
          ),
        },
      );
      final docs = await db2['heroes'].find().exec();
      expect(docs.length, 1);
      expect(docs.first.get('age'), 100);
      await db2.close();
      await dir.delete(recursive: true);
    });
  });

  group('replication', () {
    test('pull, push and pull stream implemented in Dart', () async {
      final remote = _FakeRemote();
      remote.upsert(hero('remote1', name: 'from-remote'));

      final db = await createTestDatabase();
      final heroes = db['heroes'];
      final replication = await heroes.replicate(
        replicationIdentifier: 'test-replication',
        pull: ReplicationPullOptions(
          batchSize: 2,
          handler: (checkpoint, batchSize) async => remote.pull(checkpoint, batchSize),
          stream: remote.stream,
        ),
        push: ReplicationPushOptions(handler: (rows) async => remote.push(rows)),
      );
      final errors = <RxError>[];
      final errorSub = replication.error$.listen(errors.add);

      await replication.awaitInitialReplication();
      final pulled = await heroes.findOne('remote1').exec();
      expect(pulled!.get('name'), 'from-remote');

      // push
      await heroes.insert(hero('local1', name: 'from-local'));
      await replication.awaitInSync();
      expect(remote.docs['local1']!['name'], 'from-local');

      // pull stream
      remote.upsert(hero('remote2', name: 'streamed'));
      final streamed = await waitFor(heroes.findOne('remote2').$, (d) => d != null);
      expect(streamed!.get('name'), 'streamed');

      // deletes are replicated
      await (await heroes.findOne('local1').exec())!.remove();
      await replication.awaitInSync();
      expect(remote.docs['local1']!['_deleted'], isTrue);

      expect(errors, isEmpty);
      await errorSub.cancel();
      await replication.cancel();
      await db.close();
    });
    test('push conflicts are resolved', () async {
      final remote = _FakeRemote();
      final db = await createTestDatabase();
      final heroes = db['heroes'];
      final replication = await heroes.replicate(
        replicationIdentifier: 'conflict-replication',
        live: true,
        pull: ReplicationPullOptions(handler: (checkpoint, batchSize) async => remote.pull(checkpoint, batchSize)),
        push: ReplicationPushOptions(handler: (rows) async => remote.push(rows)),
      );
      await replication.awaitInitialReplication();
      // the remote has a newer state that the client does not know about
      remote.upsert(hero('x', name: 'remote-state'));
      await heroes.insert(hero('x', name: 'local-state'));
      await replication.reSync();
      await replication.awaitInSync();
      // the default conflict handler lets the remote state win
      final doc = await waitFor(heroes.findOne('x').$, (d) => d?.get('name') == 'remote-state');
      expect(doc!.get('name'), 'remote-state');
      await db.close();
    });
    test('errors of Dart handlers are emitted in error\$', () async {
      final db = await createTestDatabase();
      final replication = await db['heroes'].replicate(
        replicationIdentifier: 'error-replication',
        retryTime: const Duration(milliseconds: 100),
        pull: ReplicationPullOptions(handler: (checkpoint, batchSize) async => throw Exception('remote not reachable')),
      );
      final error = await replication.error$.first.timeout(const Duration(seconds: 10));
      expect(error.toString(), contains('RC_PULL'));
      await replication.cancel();
      await db.close();
    });
  });
}

Future<void> waitForCondition(bool Function() condition, {Duration timeout = const Duration(seconds: 10)}) async {
  final end = DateTime.now().add(timeout);
  while (!condition()) {
    if (DateTime.now().isAfter(end)) {
      throw TimeoutException('waitForCondition() timed out');
    }
    await Future<void>.delayed(const Duration(milliseconds: 20));
  }
}

/// A remote server that lives in memory and implements a checkpoint based
/// pull, a conflict detecting push and a change stream.
class _FakeRemote {
  final Map<String, Map<String, dynamic>> docs = {};
  final Map<String, int> _updatedAt = {};
  int _time = 0;
  final StreamController<ReplicationPullStreamItem> _changes = StreamController.broadcast();

  Stream<ReplicationPullStreamItem> get stream => _changes.stream;

  void upsert(Map<String, dynamic> doc) {
    final data = {...doc, '_deleted': doc['_deleted'] ?? false};
    final id = data['id'] as String;
    docs[id] = data;
    _updatedAt[id] = ++_time;
    _changes.add(ReplicationPullStreamItem(documents: [data], checkpoint: {'id': id, 'updatedAt': _time}));
  }

  ReplicationPullResult pull(dynamic checkpoint, int batchSize) {
    final lastTime = checkpoint == null ? 0 : (checkpoint['updatedAt'] as int);
    final lastId = checkpoint == null ? '' : (checkpoint['id'] as String);
    final ids =
        docs.keys.where((id) {
          final t = _updatedAt[id]!;
          return t > lastTime || (t == lastTime && id.compareTo(lastId) > 0);
        }).toList()..sort((a, b) {
          final c = _updatedAt[a]!.compareTo(_updatedAt[b]!);
          return c != 0 ? c : a.compareTo(b);
        });
    final batch = ids.take(batchSize).toList();
    final newCheckpoint = batch.isEmpty ? checkpoint : {'id': batch.last, 'updatedAt': _updatedAt[batch.last]};
    return ReplicationPullResult(documents: batch.map((id) => docs[id]!).toList(), checkpoint: newCheckpoint);
  }

  List<Map<String, dynamic>> push(List<RxReplicationWriteToMasterRow> rows) {
    final conflicts = <Map<String, dynamic>>[];
    for (final row in rows) {
      final id = row.newDocumentState['id'] as String;
      final current = docs[id];
      final assumed = row.assumedMasterState;
      final isConflict =
          current != null &&
          (assumed == null || assumed['name'] != current['name'] || assumed['_deleted'] != current['_deleted']);
      if (isConflict) {
        conflicts.add(current);
      } else {
        upsert(row.newDocumentState);
      }
    }
    return conflicts;
  }
}
