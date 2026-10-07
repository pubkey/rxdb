import 'dart:async';
import 'dart:convert';

import 'errors.dart';
import 'js_runtime.dart';

typedef RxBridgeHandler = FutureOr<dynamic> Function(dynamic params);
typedef RxLogHandler = void Function(String level, String message);

class _Subscription {
  final void Function(dynamic value) onValue;
  final void Function(RxError error) onError;
  final void Function() onDone;
  _Subscription(this.onValue, this.onError, this.onDone);
}

/// Connects Dart with the RxDB JavaScript bundle.
/// Both sides can make requests to each other and JavaScript
/// can push values of observed RxJS observables to Dart.
class RxBridge {
  final RxJsRuntime runtime;
  final RxLogHandler? onLog;

  final Map<String, RxBridgeHandler> handlers = {};
  final Map<int, Completer<dynamic>> _openRequests = {};
  final Map<String, _Subscription> _subscriptions = {};
  final Completer<String> _ready = Completer<String>();
  int _lastRequestId = 0;
  int _lastSubscriptionId = 0;
  bool _closed = false;

  /// The RxDB version of the JavaScript bundle.
  String? jsVersion;

  RxBridge(this.runtime, {this.onLog});

  bool get closed => _closed;

  Future<void> start(String bundle, {Duration timeout = const Duration(seconds: 60)}) async {
    await runtime.start(bundle, _onMessage);
    jsVersion = await _ready.future.timeout(timeout);
  }

  /// Calls a method on the JavaScript side.
  Future<dynamic> call(String method, [Map<String, dynamic>? params]) {
    if (_closed) {
      return Future.error(RxError(code: 'FL3', message: 'The RxDB bridge is already closed. Method: $method'));
    }
    final id = _lastRequestId++;
    final completer = Completer<dynamic>();
    _openRequests[id] = completer;
    _send({'t': 'req', 'id': id, 'm': method, 'p': params ?? const {}});
    return completer.future;
  }

  /// Subscribes to an observable on the JavaScript side.
  /// Each listener of the returned stream starts its own subscription
  /// and the JavaScript subscription is stopped when the listener cancels.
  Stream<T> observe<T>(Map<String, dynamic> params, T Function(dynamic value) mapValue) {
    return Stream<T>.multi((controller) {
      final sid = 's${_lastSubscriptionId++}';
      _subscriptions[sid] = _Subscription(
        (value) {
          try {
            controller.addSync(mapValue(value));
          } catch (err, stack) {
            controller.addErrorSync(err, stack);
          }
        },
        (err) => controller.addErrorSync(err),
        () => controller.closeSync(),
      );
      call('sub.start', {...params, 'sid': sid}).catchError((Object err) {
        _subscriptions.remove(sid);
        controller.addError(err);
        controller.close();
      });
      controller.onCancel = () {
        if (_subscriptions.remove(sid) != null && !_closed) {
          call('sub.stop', {'sid': sid}).catchError((_) {});
        }
      };
    });
  }

  void _send(Map<String, dynamic> message) {
    final json = jsonEncode(message);
    runtime.send(json).catchError((Object err) {
      final id = message['id'];
      if (message['t'] == 'req' && id is int) {
        _openRequests.remove(id)?.completeError(err);
      }
    });
  }

  void _onMessage(String json) {
    final Map<String, dynamic> message = jsonDecode(json);
    switch (message['t']) {
      case 'res':
        final completer = _openRequests.remove(message['id']);
        if (completer == null) {
          return;
        }
        final error = message['e'];
        if (error != null) {
          completer.completeError(RxError.fromJson(error));
        } else {
          completer.complete(message['r']);
        }
        break;
      case 'req':
        _handleRequest(message['id'] as int, message['m'] as String, message['p']);
        break;
      case 'evt':
        final sub = _subscriptions[message['s']];
        if (sub == null) {
          return;
        }
        if (message['e'] != null) {
          sub.onError(RxError.fromJson(message['e']));
        } else if (message['c'] == 1) {
          _subscriptions.remove(message['s']);
          sub.onDone();
        } else {
          sub.onValue(message['v']);
        }
        break;
      case 'log':
        final level = message['level'] as String;
        final text = (message['args'] as List).join(' ');
        if (onLog != null) {
          onLog!(level, text);
        } else {
          // ignore: avoid_print
          print('[rxdb:$level] $text');
        }
        break;
      case 'ready':
        if (!_ready.isCompleted) {
          _ready.complete(message['version'] as String);
        }
        break;
    }
  }

  Future<void> _handleRequest(int id, String method, dynamic params) async {
    final handler = handlers[method];
    try {
      if (handler == null) {
        throw RxError(code: 'FL2', message: 'No Dart handler for method $method');
      }
      final result = await handler(params);
      if (_closed) {
        return;
      }
      _send({'t': 'res', 'id': id, 'r': result});
    } catch (err, stack) {
      if (_closed) {
        return;
      }
      _send({'t': 'res', 'id': id, 'e': errorToJson(err, stack)});
    }
  }

  Future<void> close() async {
    if (_closed) {
      return;
    }
    _closed = true;
    final subscriptions = _subscriptions.values.toList();
    _subscriptions.clear();
    for (final sub in subscriptions) {
      sub.onDone();
    }
    final openRequests = _openRequests.values.toList();
    _openRequests.clear();
    for (final completer in openRequests) {
      completer.completeError(RxError(code: 'FL3', message: 'The RxDB bridge was closed'));
    }
    await runtime.close();
  }
}
