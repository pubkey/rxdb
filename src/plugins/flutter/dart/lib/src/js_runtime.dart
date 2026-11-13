import 'dart:async';

/// A JavaScript runtime in which the RxDB bundle runs.
///
/// The bridge only exchanges strings in both directions, so any
/// JavaScript engine can be used as long as it can:
/// - call a Dart function with a string (JavaScript calls `__rxdbFlutterSend(json)`),
/// - evaluate `__rxdbFlutterReceive(json)` to deliver a string to JavaScript.
abstract class RxJsRuntime {
  /// Starts the runtime, defines the global `__rxdbFlutterSend` function
  /// which must call [onMessage] and then evaluates the [bundle].
  Future<void> start(String bundle, void Function(String message) onMessage);

  /// Delivers a message to the JavaScript side.
  Future<void> send(String message);

  /// Stops the runtime and frees its resources.
  Future<void> close();
}
