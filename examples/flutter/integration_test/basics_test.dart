import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:my_app/main.dart' as app;
import 'package:my_app/main.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets('test basic document insert and query', (tester) async {

    // if your testing device is too slow, increase this time.
    const int securityWaitTime = 1000;

    await RxDatabaseState.init("flutter-test-db-${DateTime.now()}");
    await tester.pumpWidget(const app.MyApp());

    // insert one hero
    await tester.enterText(find.byKey(const Key('input-name')), 'alice');
    await tester.enterText(find.byKey(const Key('input-color')), 'red');
    await tester.tap(find.byKey(const Key('button-save')));
    await Future.delayed(const Duration(milliseconds: securityWaitTime));

    // ensure that the heroes list has updated
    Finder aliceListTile = find.byKey(const Key('list-tile-alice'));
    final textWidget = tester.firstWidget<ListTile>(aliceListTile);
    expect(textWidget.title.toString(), equals('Text("color: red")'));

    // delete the hero
    await tester.tap(find.byKey(const Key('button-delete-alice')));
    await Future.delayed(const Duration(milliseconds: securityWaitTime));
    Finder aliceListTileAfter = find.byKey(const Key('list-tile-alice'));
    expect(aliceListTileAfter.evaluate().length, equals(0));

    await Future.delayed(const Duration(seconds: 1));
  });
}
