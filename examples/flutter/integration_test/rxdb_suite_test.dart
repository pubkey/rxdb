import 'package:flutter/services.dart';
import 'package:integration_test/integration_test.dart';
import 'package:rxdb/rxdb.dart';

// The test suite of the rxdb Dart package. In the package itself it runs with Node.js,
// here the same tests run with the QuickJS runtime (fjs) on a real Flutter platform.
import '../../../src/plugins/flutter/dart/test/helper.dart' as helper;
import '../../../src/plugins/flutter/dart/test/rxdb_test.dart' as suite;

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  helper.createTestRuntime = () => FjsRuntime();
  helper.loadTestBundle = () => rootBundle.loadString(rxdbBundleAssetKey);
  suite.main();
}
