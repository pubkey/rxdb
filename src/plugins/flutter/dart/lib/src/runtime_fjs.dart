import 'dart:async';
import 'dart:convert';

import 'package:fjs/fjs.dart';

import 'js_runtime.dart';

Future<void>? _libFjsInit;

Future<void> _ensureLibFjsInitialized() {
  return _libFjsInit ??= () async {
    try {
      await LibFjs.init();
    } catch (err) {
      // LibFjs.init() throws when the app already initialized fjs itself.
      if (!err.toString().toLowerCase().contains('already')) {
        rethrow;
      }
    }
  }();
}

/// Runs the RxDB JavaScript bundle inside of QuickJS via the
/// [fjs](https://pub.dev/packages/fjs) package.
/// This is the default runtime on Android, iOS, macOS, Linux and Windows.
class FjsRuntime implements RxJsRuntime {
  /// Memory limit of the QuickJS runtime in bytes.
  final int? memoryLimit;

  /// Maximum stack size of the QuickJS runtime in bytes.
  final int maxStackSize;

  JsEngine? _engine;

  FjsRuntime({this.memoryLimit, this.maxStackSize = 1024 * 1024});

  JsEngine get engine {
    final engine = _engine;
    if (engine == null) {
      throw StateError('FjsRuntime not started');
    }
    return engine;
  }

  @override
  Future<void> start(String bundle, void Function(String message) onMessage) async {
    await _ensureLibFjsInitialized();
    final engine = await JsEngine.create(
      builtins: const JsBuiltinOptions(timers: true),
      runtimeOptions: JsEngineRuntimeOptions(
        memoryLimit: memoryLimit == null ? null : BigInt.from(memoryLimit!),
        maxStackSize: BigInt.from(maxStackSize),
        info: 'rxdb',
      ),
    );
    _engine = engine;
    await engine.init(
      bridge: (JsValue value) {
        final message = value.value;
        if (message is String) {
          onMessage(message);
        }
        return const JsResult.ok(JsValue.none());
      },
    );
    await engine.eval(
      source: const JsCode.code(
        'globalThis.__rxdbFlutterSend = function (m) {'
        ' var p = fjs.bridge_call(m);'
        ' if (p && typeof p.catch === "function") { p.catch(function () {}); }'
        '}; void 0;',
      ),
      options: JsEvalOptions(global: true, strict: false, promise: false),
    );
    await engine.eval(
      source: JsCode.code('$bundle\n;void 0;'),
      options: JsEvalOptions(global: true, strict: false, promise: false),
    );
  }

  @override
  Future<void> send(String message) async {
    await engine.eval(
      source: JsCode.code('__rxdbFlutterReceive(${jsonEncode(message)}); void 0;'),
      options: JsEvalOptions(global: true, strict: false, promise: false),
    );
  }

  @override
  Future<void> close() async {
    final engine = _engine;
    _engine = null;
    if (engine != null && !engine.closed) {
      await engine.close();
    }
  }
}
