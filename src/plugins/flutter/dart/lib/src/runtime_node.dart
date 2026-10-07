import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'js_runtime.dart';

const String _nodeHarness = r'''
const fs = require('fs');
const vm = require('vm');
const readline = require('readline');
globalThis.__rxdbFlutterSend = function (m) {
    process.stdout.write(m + '\n');
};
vm.runInThisContext(fs.readFileSync(process.argv[1], 'utf-8'), { filename: 'rxdb-flutter.js' });
const rl = readline.createInterface({ input: process.stdin, terminal: false });
rl.on('line', function (line) {
    if (line.length > 0) {
        globalThis.__rxdbFlutterReceive(line);
    }
});
rl.on('close', function () {
    process.exit(0);
});
''';

/// Runs the RxDB JavaScript bundle in a Node.js child process.
///
/// Messages are exchanged as newline-delimited JSON over stdin and stdout.
/// This runtime is used to run the Dart tests of the rxdb package
/// on a CI server without a device or emulator. It only works on platforms
/// where `dart:io` can spawn processes, so do not use it in a mobile app.
class NodeJsRuntime implements RxJsRuntime {
  /// Path to the node binary.
  final String nodeExecutable;

  Process? _process;
  Directory? _tmpDir;
  final StringBuffer _stderr = StringBuffer();

  NodeJsRuntime({this.nodeExecutable = 'node'});

  /// Everything that the node process wrote to stderr.
  String get stderrOutput => _stderr.toString();

  @override
  Future<void> start(String bundle, void Function(String message) onMessage) async {
    final tmpDir = await Directory.systemTemp.createTemp('rxdb-node-runtime-');
    _tmpDir = tmpDir;
    final bundleFile = File('${tmpDir.path}/rxdb-flutter.js');
    await bundleFile.writeAsString(bundle);
    final process = await Process.start(nodeExecutable, ['-e', _nodeHarness, bundleFile.path]);
    _process = process;
    process.stdout.transform(utf8.decoder).transform(const LineSplitter()).listen((line) {
      if (line.isNotEmpty) {
        onMessage(line);
      }
    });
    process.stderr.transform(utf8.decoder).listen((chunk) {
      _stderr.write(chunk);
      stderr.write(chunk);
    });
  }

  @override
  Future<void> send(String message) async {
    final process = _process;
    if (process == null) {
      throw StateError('NodeJsRuntime not started');
    }
    process.stdin.writeln(message);
  }

  @override
  Future<void> close() async {
    final process = _process;
    _process = null;
    if (process != null) {
      await process.stdin.close();
      await process.exitCode.timeout(
        const Duration(seconds: 5),
        onTimeout: () {
          process.kill();
          return -1;
        },
      );
    }
    final tmpDir = _tmpDir;
    _tmpDir = null;
    if (tmpDir != null && tmpDir.existsSync()) {
      await tmpDir.delete(recursive: true);
    }
  }
}
