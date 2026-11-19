import 'dart:convert';
import 'dart:io';

import 'package:crypto/crypto.dart';
import 'package:path/path.dart' as p;
import 'package:sqlite3/sqlite3.dart';

import 'bridge.dart';

class _OpenDatabase {
  final Database db;
  final String name;
  int refCount = 1;
  _OpenDatabase(this.db, this.name);
}

/// Runs the SQL queries of the RxDB SQLite storage
/// with the sqlite3 package in Dart.
class RxSQLiteHost {
  /// Directory in which the SQLite files are stored.
  /// When null, all databases are kept in memory.
  final String? directory;

  final Map<int, _OpenDatabase> _byHandle = {};
  final Map<String, int> _handleByName = {};
  int _lastHandle = 0;

  RxSQLiteHost({this.directory});

  /// Returns the file path of the SQLite file for the given name.
  String? filePath(String name) {
    final dir = directory;
    if (dir == null) {
      return null;
    }
    final safeName = name.replaceAll(RegExp(r'[^a-zA-Z0-9_\-.]'), '_');
    return p.join(dir, '$safeName.sqlite');
  }

  int open(String name) {
    final existing = _handleByName[name];
    if (existing != null) {
      _byHandle[existing]!.refCount++;
      return existing;
    }
    final path = filePath(name);
    final Database db;
    if (path == null) {
      db = sqlite3.openInMemory();
    } else {
      Directory(p.dirname(path)).createSync(recursive: true);
      db = sqlite3.open(path);
    }
    final handle = _lastHandle++;
    _byHandle[handle] = _OpenDatabase(db, name);
    _handleByName[name] = handle;
    return handle;
  }

  Database _get(int handle) {
    final open = _byHandle[handle];
    if (open == null) {
      throw StateError('SQLite database handle $handle is not open');
    }
    return open.db;
  }

  List<Map<String, Object?>> all(int handle, String sql, List<Object?> params) {
    final result = _get(handle).select(sql, params);
    return result.map((row) => Map<String, Object?>.from(row)).toList();
  }

  void run(int handle, String sql, List<Object?> params) {
    _get(handle).execute(sql, params);
  }

  /// Returns true when the database connection was closed
  /// because no other user has it open.
  bool close(int handle) {
    final open = _byHandle[handle];
    if (open == null) {
      return true;
    }
    open.refCount--;
    if (open.refCount <= 0) {
      _byHandle.remove(handle);
      _handleByName.remove(open.name);
      open.db.close();
      return true;
    }
    return false;
  }

  void closeAll() {
    for (final open in _byHandle.values) {
      open.db.close();
    }
    _byHandle.clear();
    _handleByName.clear();
  }

  void register(RxBridge bridge) {
    bridge.handlers['sqlite.open'] = (params) => open(params['name'] as String);
    bridge.handlers['sqlite.all'] = (params) =>
        all(params['db'] as int, params['sql'] as String, List<Object?>.from(params['params'] as List));
    bridge.handlers['sqlite.run'] = (params) {
      run(params['db'] as int, params['sql'] as String, List<Object?>.from(params['params'] as List));
      return null;
    };
    bridge.handlers['sqlite.close'] = (params) => close(params['db'] as int);
    bridge.handlers['hash.sha256'] = (params) => sha256.convert(utf8.encode(params['input'] as String)).toString();
  }
}
