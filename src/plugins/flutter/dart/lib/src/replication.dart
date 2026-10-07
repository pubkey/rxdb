import 'dart:async';

import 'collection.dart';
import 'errors.dart';

/// The result of a pull handler: the documents that changed after the given
/// checkpoint and the checkpoint of the last returned document.
class ReplicationPullResult {
  final List<Map<String, dynamic>> documents;
  final dynamic checkpoint;

  ReplicationPullResult({required this.documents, required this.checkpoint});

  Map<String, dynamic> toJson() => {'documents': documents, 'checkpoint': checkpoint};
}

/// An item of the pull stream. Either documents with a checkpoint
/// or a RESYNC flag that makes the replication run the pull handler
/// to catch up, for example after a reconnect.
class ReplicationPullStreamItem {
  final List<Map<String, dynamic>>? documents;
  final dynamic checkpoint;
  final bool isResync;

  ReplicationPullStreamItem({required List<Map<String, dynamic>> this.documents, required this.checkpoint})
    : isResync = false;

  ReplicationPullStreamItem.resync() : documents = null, checkpoint = null, isResync = true;

  dynamic toJson() => isResync ? 'RESYNC' : {'documents': documents, 'checkpoint': checkpoint};
}

typedef ReplicationPullHandler = Future<ReplicationPullResult> Function(dynamic lastCheckpoint, int batchSize);

class ReplicationPullOptions {
  /// Fetches the documents that changed after [lastCheckpoint] from the remote.
  /// [lastCheckpoint] is null on the first run.
  final ReplicationPullHandler handler;

  /// Optional realtime changes from the remote,
  /// for example from a WebSocket or Server-Sent Events.
  final Stream<ReplicationPullStreamItem>? stream;
  final int batchSize;
  final dynamic initialCheckpoint;

  ReplicationPullOptions({required this.handler, this.stream, this.batchSize = 100, this.initialCheckpoint});
}

/// A row that the push handler has to write to the remote.
class RxReplicationWriteToMasterRow {
  /// The new state of the document.
  final Map<String, dynamic> newDocumentState;

  /// The state that the client assumes the remote has.
  /// Null when the document is new on the client.
  final Map<String, dynamic>? assumedMasterState;

  RxReplicationWriteToMasterRow({required this.newDocumentState, this.assumedMasterState});

  factory RxReplicationWriteToMasterRow.fromJson(dynamic json) {
    final map = json as Map;
    return RxReplicationWriteToMasterRow(
      newDocumentState: Map<String, dynamic>.from(map['newDocumentState'] as Map),
      assumedMasterState: map['assumedMasterState'] == null
          ? null
          : Map<String, dynamic>.from(map['assumedMasterState'] as Map),
    );
  }

  Map<String, dynamic> toJson() => {
    'newDocumentState': newDocumentState,
    if (assumedMasterState != null) 'assumedMasterState': assumedMasterState,
  };
}

/// Writes the rows to the remote and returns the conflicting master states.
/// Return an empty list when there were no conflicts.
typedef ReplicationPushHandler = Future<List<Map<String, dynamic>>> Function(List<RxReplicationWriteToMasterRow> rows);

class ReplicationPushOptions {
  final ReplicationPushHandler handler;
  final int batchSize;
  final dynamic initialCheckpoint;

  ReplicationPushOptions({required this.handler, this.batchSize = 100, this.initialCheckpoint});
}

int _lastReplicationId = 0;

/// A running replication, see https://rxdb.info/replication.html
/// The replication protocol runs in JavaScript and calls the
/// pull and push handlers that are implemented in Dart.
class RxReplicationState {
  final RxCollection collection;
  final String replicationIdentifier;
  final String _rid;
  final ReplicationPullOptions? pull;
  final ReplicationPushOptions? push;
  StreamSubscription<ReplicationPullStreamItem>? _pullStreamSub;
  bool _canceled = false;

  RxReplicationState._(this.collection, this.replicationIdentifier, this._rid, this.pull, this.push);

  static Future<RxReplicationState> create({
    required RxCollection collection,
    required String replicationIdentifier,
    ReplicationPullOptions? pull,
    ReplicationPushOptions? push,
    required bool live,
    required Duration retryTime,
    required bool autoStart,
    required String deletedField,
    required bool waitForLeadership,
  }) async {
    if (pull == null && push == null) {
      throw RxError(code: 'UT3', message: 'A replication needs pull or push options');
    }
    final rid = 'r${_lastReplicationId++}';
    final state = RxReplicationState._(collection, replicationIdentifier, rid, pull, push);
    collection.database.registerReplication(rid, state);
    try {
      await collection.callJs('replication.create', {
        'rid': rid,
        'replicationIdentifier': replicationIdentifier,
        'live': live,
        'retryTime': retryTime.inMilliseconds,
        'autoStart': autoStart,
        'deletedField': deletedField,
        'waitForLeadership': waitForLeadership,
        if (pull != null)
          'pull': {
            'batchSize': pull.batchSize,
            if (pull.initialCheckpoint != null) 'initialCheckpoint': pull.initialCheckpoint,
          },
        if (push != null)
          'push': {
            'batchSize': push.batchSize,
            if (push.initialCheckpoint != null) 'initialCheckpoint': push.initialCheckpoint,
          },
      });
    } catch (err) {
      collection.database.unregisterReplication(rid);
      rethrow;
    }
    final stream = pull?.stream;
    if (stream != null) {
      state._pullStreamSub = stream.listen(
        (item) => state.emitEvent(item),
        onError: (Object _) => state.emitEvent(ReplicationPullStreamItem.resync()),
      );
    }
    return state;
  }

  Future<dynamic> runPullHandler(dynamic checkpoint, int batchSize) async {
    final result = await pull!.handler(checkpoint, batchSize);
    return result.toJson();
  }

  Future<dynamic> runPushHandler(List<dynamic> rows) async {
    final result = await push!.handler(rows.map(RxReplicationWriteToMasterRow.fromJson).toList());
    return result;
  }

  Future<dynamic> _call(String method) =>
      collection.database.bridge.call('replication.call', {'rid': _rid, 'method': method});

  Stream<T> _observe<T>(String stream, T Function(dynamic v) mapValue) =>
      collection.database.bridge.observe({'kind': 'replication', 'rid': _rid, 'stream': stream}, mapValue);

  /// Emits each document that was received from the remote.
  Stream<Map<String, dynamic>> get received$ => _observe('received', (v) => Map<String, dynamic>.from(v as Map));

  /// Emits each document that was sent to the remote.
  Stream<Map<String, dynamic>> get sent$ => _observe('sent', (v) => Map<String, dynamic>.from(v as Map));

  /// Emits errors, for example when a pull or push handler throws.
  Stream<RxError> get error$ => _observe('error', (v) => RxError.fromJson(v));

  /// Emits true while the replication is running a pull or push.
  Stream<bool> get active$ => _observe('active', (v) => v == true);

  Stream<bool> get canceled$ => _observe('canceled', (v) => v == true);

  /// Sends an item of the pull stream to the replication.
  Future<void> emitEvent(ReplicationPullStreamItem item) async {
    if (_canceled) {
      return;
    }
    await collection.database.bridge.call('replication.emit', {'rid': _rid, 'item': item.toJson()});
  }

  /// Makes the replication run the pull handler, for example after the client was offline.
  Future<void> reSync() => _call('reSync');

  /// Resolves when the initial replication is done.
  Future<void> awaitInitialReplication() => _call('awaitInitialReplication');

  /// Resolves when all local and remote changes are replicated.
  Future<void> awaitInSync() => _call('awaitInSync');

  Future<void> start() => _call('start');
  Future<void> pause() => _call('pause');
  Future<bool> isStopped() async => await _call('isStopped') == true;
  Future<bool> isPaused() async => await _call('isPaused') == true;

  /// Stops the replication.
  Future<void> cancel() async {
    if (_canceled) {
      return;
    }
    _canceled = true;
    await _pullStreamSub?.cancel();
    try {
      await _call('cancel');
    } finally {
      collection.database.unregisterReplication(_rid);
    }
  }

  /// Stops the replication and removes its metadata,
  /// so a new replication with the same identifier starts from scratch.
  Future<void> remove() async {
    _canceled = true;
    await _pullStreamSub?.cancel();
    try {
      await _call('remove');
    } finally {
      collection.database.unregisterReplication(_rid);
    }
  }
}
