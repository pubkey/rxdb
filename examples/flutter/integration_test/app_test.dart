import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:rxdb/rxdb.dart';
import 'package:rxdb_flutter_example/main.dart';

/// These tests run RxDB inside of QuickJS (fjs) with the SQLite storage
/// on a real Flutter platform, for example `flutter test integration_test -d linux`.
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  Future<void> pumpUntil(WidgetTester tester, bool Function() condition) async {
    final end = DateTime.now().add(const Duration(seconds: 20));
    while (!condition()) {
      if (DateTime.now().isAfter(end)) {
        throw TimeoutException('pumpUntil() timed out');
      }
      await tester.runAsync(() => Future<void>.delayed(const Duration(milliseconds: 50)));
      await tester.pump();
    }
  }

  testWidgets('insert, observe and remove heroes in the UI', (tester) async {
    final database = (await tester.runAsync(
      () => createHeroesDatabase(name: 'ui-test-${DateTime.now().microsecondsSinceEpoch}', inMemory: true),
    ))!;
    await tester.pumpWidget(HeroesApp(database: database));

    await tester.enterText(find.byKey(const Key('input-name')), 'alice');
    await tester.enterText(find.byKey(const Key('input-color')), 'red');
    await tester.tap(find.byKey(const Key('button-save')));
    await pumpUntil(tester, () => find.byKey(const Key('list-tile-alice')).evaluate().isNotEmpty);
    expect(find.text('color: red'), findsOneWidget);
    await pumpUntil(tester, () => find.text('Heroes (1)').evaluate().isNotEmpty);

    await tester.tap(find.byKey(const Key('button-delete-alice')));
    await pumpUntil(tester, () => find.byKey(const Key('list-tile-alice')).evaluate().isEmpty);
    await pumpUntil(tester, () => find.text('Heroes (0)').evaluate().isNotEmpty);

    await tester.runAsync(() => database.close());
  });

  testWidgets('queries, documents and replication on the QuickJS runtime', (tester) async {
    await tester.runAsync(() async {
      final database = await createHeroesDatabase(
        name: 'api-test-${DateTime.now().microsecondsSinceEpoch}',
        inMemory: true,
      );
      final heroes = database['heroes'];

      await heroes.bulkInsert([
        {'id': 'a', 'name': 'Alice', 'color': 'red'},
        {'id': 'b', 'name': 'Bob', 'color': 'blue'},
      ]);
      final red = await heroes.find({
        'selector': {'color': 'red'},
      }).exec();
      expect(red.map((d) => d.primary), ['a']);

      final doc = await heroes.findOne('b').exec();
      final patched = await doc!.patch({'color': 'green'});
      expect(patched.get('color'), 'green');

      final counts = <int>[];
      final sub = heroes.count().$.listen(counts.add);
      await heroes.insert({'id': 'c', 'name': 'Carol', 'color': 'red'});
      final end = DateTime.now().add(const Duration(seconds: 10));
      while (!counts.contains(3)) {
        if (DateTime.now().isAfter(end)) {
          fail('count did not update: $counts');
        }
        await Future<void>.delayed(const Duration(milliseconds: 20));
      }
      await sub.cancel();

      // replication with handlers implemented in Dart
      final remote = <String, Map<String, dynamic>>{
        'r1': {'id': 'r1', 'name': 'Remote', 'color': 'black', '_deleted': false},
      };
      final replication = await heroes.replicate(
        replicationIdentifier: 'integration-test',
        live: false,
        pull: ReplicationPullOptions(
          handler: (checkpoint, batchSize) async => ReplicationPullResult(
            documents: checkpoint == null ? remote.values.toList() : [],
            checkpoint: {'done': true},
          ),
        ),
        push: ReplicationPushOptions(
          handler: (rows) async {
            for (final row in rows) {
              remote[row.newDocumentState['id'] as String] = row.newDocumentState;
            }
            return [];
          },
        ),
      );
      await replication.awaitInitialReplication();
      expect((await heroes.findOne('r1').exec())!.get('name'), 'Remote');
      expect(remote.keys, containsAll(['a', 'b', 'c']));
      await database.remove();
    });
  });
}
