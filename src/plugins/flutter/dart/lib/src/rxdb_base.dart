// ignore_for_file: prefer_interpolation_to_compose_strings

import 'package:flutter/services.dart';
import 'package:flutter_qjs/flutter_qjs.dart';
import 'package:rxdart/rxdart.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';

/**
 * Extend the JavaScript runtime with some missing stuff
 * so that it can work together with RxDB JavaScript code.
 */
Future<dynamic> patchJavaScriptRuntime(FlutterQjs engine) async {
  final prefs = await SharedPreferences.getInstance();

  await engine.evaluate('process = {};');
  await engine.evaluate('window = {};');
  await engine.evaluate('console = {};');

  await engine.evaluate('BigInt = {};');
  await engine.evaluate('BigInt64Array = {};');
  await engine.evaluate('BigUint64Array = {};');


  final setToGlobalObject =
      await engine.evaluate("(key, val) => { this[key] = val; }");
  await setToGlobalObject.invoke([
    "setTimeoutWait",
    (int time) async {
      await Future.delayed(Duration(milliseconds: time));
    }
  ]);
  await engine.evaluate("""
          let timeoutId = 0;
          let runningTimeouts = new Set();
          function setTimeout(fn, time) { 
            let id = timeoutId++;
            runningTimeouts.add(id);
            (async() => {
              await setTimeoutWait(time);
              if(!runningTimeouts.has(id)){
                return;
              }
              clearTimeout(id);
              fn();
            })();
            return id;
          }
          function clearTimeout(id) {
            runningTimeouts.delete(id);
          }
        """);
  await engine.evaluate("""
          let intervalid = 0;
          let intervalMap = {};
          function setInterval(callback, delay = 0, ...args) {
            let id = intervalid++;
            function repeat() {
              intervalMap[id] = setTimeout(() => {
              callback(...args)
              if(intervalMap[id]) {
                repeat()
              }
            }, delay)
            }
            repeat();
            return id;
          }
          function clearInterval(intervalid) {
            clearTimeout(intervalMap[intervalid])
            delete intervalMap[intervalid]
          }    
  """);
  await setToGlobalObject.invoke([
    "persistKeyValue",
    (String key, String value) async {
      await prefs.setString(key, value);
    }
  ]);
  await setToGlobalObject.invoke([
    "readKeyValue",
    (String key) async {
      final String? value = prefs.getString(key);
      return value;
    }
  ]);

  return setToGlobalObject;
}

Future<RxDatabase> getRxDatabase(String jsFilePath, String databaseName) async {
  String plainJsCode = await rootBundle.loadString(jsFilePath);
  FlutterQjs engine = FlutterQjs(stackSize: 1024 * 1024);
  engine.dispatch();
  final setToGlobalObject = await patchJavaScriptRuntime(engine);

  ReplaySubject<RxChangeEventBulk<dynamic>> events = ReplaySubject();
  await setToGlobalObject.invoke([
    "sendRxDBEvent",
    (String eventJSON) async {
      var parsedJSON = jsonDecode(eventJSON);
      var eventBulk = RxChangeEventBulk.fromJSON(parsedJSON);
      events.add(eventBulk);
    }
  ]);

  setToGlobalObject.free();

  // run the RxDatabase creation JavaScript code
  await engine.evaluate(plainJsCode);
  var databaseConfigPlain =
      await engine.evaluate('process.init("' + databaseName + '");');

  // load the RxDatabase configuration and collection meta data.
  var databaseConfig = Map<String, dynamic>.from(databaseConfigPlain);
  var configCollectionsMetaJson = databaseConfig['collections'];
  if (configCollectionsMetaJson == null) {
    throw Exception('no collection meta given');
  }

  RxDatabase database = RxDatabase(databaseConfig['databaseName'], engine,
      events, configCollectionsMetaJson);
  return database;
}

class RxChangeEvent<RxDocType> {
  String operation;
  dynamic documentData;
  dynamic previousDocumentData;
  String documentId;
  String? collectionName;
  bool isLocal;
  RxChangeEvent(
      this.operation,
      this.documentData,
      this.previousDocumentData,
      this.documentId,
      this.collectionName,
      this.isLocal
  );

  static RxChangeEvent<RxDocType> fromJSON<RxDocType>(dynamic json) {
    RxChangeEvent<RxDocType> ret = RxChangeEvent<RxDocType>(
        json['operation'],
        json['documentData'],
        json['previousDocumentData'],
        json['documentId'],
        json['collectionName'],
        json['isLocal']
    );
    return ret;
  }
}

class RxChangeEventBulk<RxDocType> {
  String? collectionName;
  String id;

  String databaseToken;
  String storageToken;
  bool internal;
  List<RxChangeEvent<RxDocType>> events;
  dynamic checkpoint;
  String context;
  int startTime;
  int endTime;

  RxChangeEventBulk(
      this.collectionName,
      this.id,
      this.databaseToken,
      this.storageToken,
      this.internal,
      this.events,
      this.checkpoint,
      this.context,
      this.startTime,
      this.endTime);

  static RxChangeEventBulk<RxDocType> fromJSON<RxDocType>(dynamic json) {
    List<dynamic> eventsJson = json['events'];
    List<RxChangeEvent<RxDocType>> events = eventsJson.map((row) {
      var event = RxChangeEvent.fromJSON<RxDocType>(row);
      return event;
    }).toList();

    RxChangeEventBulk<RxDocType> ret = RxChangeEventBulk<RxDocType>(
        json['collectionName'],
        json['id'],
        json['databaseToken'],
        json['storageToken'],
        json['internal'],
        events,
        json['checkpoint'],
        json['context'],
        json['startTime'] ?? 0,
        json['endTime'] ?? 0);
    return ret;
  }
}

class RxDatabase<CollectionsOfDatabase> {
  String name;
  FlutterQjs engine;
  List<dynamic> collectionMeta;
  Map<String, RxCollection<dynamic>> collections = {};
  ReplaySubject<RxChangeEventBulk<dynamic>> eventBulks$;
  bool closed = false;
  RxDatabase(this.name, this.engine, this.eventBulks$, this.collectionMeta);

  String get _jsDbRef =>
      "process.databases[" + jsonEncode(name) + "].db";

  RxCollection<RxDocType> getCollection<RxDocType>(String name) {
    var meta = collectionMeta.firstWhere((meta) => meta['name'] == name);
    String collectionName = meta['name'];
    String collectionPrimaryKey = meta['primaryKey'];

    if (collections[collectionName] == null) {
      collections[collectionName] =
          RxCollection<RxDocType>(collectionName, this, collectionPrimaryKey);
    }
    var useCollection = collections[collectionName];
    if (useCollection == null) {
      throw Exception('collection does not exist');
    } else {
      return collections[name] as RxCollection<RxDocType>;
    }
  }

  Future<void> close() async {
    if (closed) return;
    await engine.evaluate('process.close(' + jsonEncode(name) + ');');
    closed = true;
    await eventBulks$.close();
    engine.close();
  }
}

class RxCollection<RxDocType> {
  String name;
  RxDatabase database;
  String primaryKey;
  late DocCache<RxDocType> docCache;
  late Stream<RxChangeEventBulk<dynamic>> eventBulks$;

  RxCollection(this.name, this.database, this.primaryKey) {
    eventBulks$ =
        database.eventBulks$.where((bulk) => bulk.collectionName == name);
    docCache = DocCache<RxDocType>(this);
  }

  String get _jsCollRef =>
      database._jsDbRef + "[" + jsonEncode(name) + "]";

  RxQuery<RxDocType> find(dynamic query) {
    var rxQuery = RxQuery<RxDocType>(query, this);
    return rxQuery;
  }

  RxQuerySingle<RxDocType> findOne([dynamic queryOrPrimaryKey]) {
    var rxQuery = RxQuerySingle<RxDocType>(queryOrPrimaryKey, this);
    return rxQuery;
  }

  Future<RxDocument<RxDocType>> insert(data) async {
    dynamic result = await database.engine.evaluate(_jsCollRef +
        ".insert(" +
        jsonEncode(data) +
        ").then(d => d.toJSON(true));");
    var document = docCache.getByDocData(result);
    return document;
  }

  Future<List<RxDocument<RxDocType>>> bulkInsert(List<dynamic> docs) async {
    List<dynamic> result = await database.engine.evaluate(_jsCollRef +
        ".bulkInsert(" +
        jsonEncode(docs) +
        ").then(r => r.success.map(d => d.toJSON(true)));");
    return result.map((docData) {
      return docCache.getByDocData(docData);
    }).toList();
  }

  Future<List<RxDocument<RxDocType>>> bulkRemove(List<String> ids) async {
    List<dynamic> result = await database.engine.evaluate(_jsCollRef +
        ".bulkRemove(" +
        jsonEncode(ids) +
        ").then(r => r.success.map(d => d.toJSON(true)));");
    return result.map((docData) {
      return docCache.getByDocData(docData);
    }).toList();
  }

  Future<RxDocument<RxDocType>> upsert(dynamic data) async {
    dynamic result = await database.engine.evaluate(_jsCollRef +
        ".upsert(" +
        jsonEncode(data) +
        ").then(d => d.toJSON(true));");
    var document = docCache.getByDocData(result);
    return document;
  }

  Future<int> count([dynamic query]) async {
    String queryStr = query != null ? jsonEncode(query) : '{}';
    dynamic result = await database.engine.evaluate(_jsCollRef +
        ".count(" +
        queryStr +
        ").exec();");
    return (result as num).toInt();
  }

  Future<void> remove() async {
    await database.engine.evaluate(_jsCollRef +
        ".remove();");
  }
}

class RxDocument<RxDocType> {
  RxCollection<RxDocType> collection;
  dynamic data;
  RxDocument(this.collection, this.data);

  String get primary => data[collection.primaryKey].toString();

  bool get deleted => data['_deleted'] == true;

  Map<String, dynamic> toJSON() {
    return Map<String, dynamic>.from(data);
  }

  dynamic get(String fieldName) {
    return data[fieldName];
  }

  /// Sets the value of a field in the local document data.
  /// This does not persist the change to the database.
  /// Use [patch] or [incrementalPatch] to persist changes.
  void set(String fieldName, dynamic value) {
    data[fieldName] = value;
  }

  Future<RxDocument<RxDocType>> patch(Map<String, dynamic> patchData) async {
    String id = primary;
    dynamic result = await collection.database.engine.evaluate(
        collection._jsCollRef +
        ".findOne(" +
        jsonEncode(id) +
        ").exec().then(d => d.patch(" +
        jsonEncode(patchData) +
        ")).then(d => d.toJSON(true));");
    data = result;
    collection.docCache.updateDocData(id, data);
    return this;
  }

  Future<RxDocument<RxDocType>> incrementalPatch(
      Map<String, dynamic> patchData) async {
    String id = primary;
    dynamic result = await collection.database.engine.evaluate(
        collection._jsCollRef +
        ".findOne(" +
        jsonEncode(id) +
        ").exec().then(d => d.incrementalPatch(" +
        jsonEncode(patchData) +
        ")).then(d => d.toJSON(true));");
    data = result;
    collection.docCache.updateDocData(id, data);
    return this;
  }

  Future<RxDocument<RxDocType>> remove() async {
    String id = primary;
    await collection.database.engine.evaluate(
        collection._jsCollRef +
        ".findOne(" +
        jsonEncode(id) +
        ").exec().then(d => d.remove());");
    return this;
  }

  Future<RxDocument<RxDocType>> incrementalRemove() async {
    String id = primary;
    await collection.database.engine.evaluate(
        collection._jsCollRef +
        ".findOne(" +
        jsonEncode(id) +
        ").exec().then(d => d.incrementalRemove());");
    return this;
  }
}

class RxQuery<RxDocType> {
  dynamic query;
  RxCollection<RxDocType> collection;

  Stream<List<RxDocument<RxDocType>>> results$ = ReplaySubject();
  bool subscribed = false;

  RxQuery(this.query, this.collection);
  Future<List<RxDocument<RxDocType>>> exec() async {
    List<dynamic> result = await collection.database.engine.evaluate(
        collection._jsCollRef +
            ".find(" +
            jsonEncode(query) +
            ").exec().then(docs => docs.map(d => d.toJSON(true)));");

    var ret = result.map((docData) {
      var doc = collection.docCache.getByDocData(docData);
      return doc;
    }).toList();

    return ret;
  }

  Stream<List<RxDocument<RxDocType>>> $() {
    if (subscribed == false) {
      subscribed = true;
      results$ = MergeStream<dynamic>([
        collection.eventBulks$,
        Stream.fromIterable([1])
      ]).asyncMap((event) async {
        var newResults = await exec();
        return newResults;
      });
    }
    return results$;
  }
}

class RxQuerySingle<RxDocType> {
  dynamic queryOrPrimaryKey;
  RxCollection<RxDocType> collection;

  Stream<RxDocument<RxDocType>?> results$ = ReplaySubject();
  bool subscribed = false;

  RxQuerySingle(this.queryOrPrimaryKey, this.collection);

  Future<RxDocument<RxDocType>?> exec() async {
    String queryArg;
    if (queryOrPrimaryKey == null) {
      queryArg = '';
    } else {
      queryArg = jsonEncode(queryOrPrimaryKey);
    }
    dynamic result = await collection.database.engine.evaluate(
        collection._jsCollRef +
        ".findOne(" +
        queryArg +
        ").exec().then(d => d ? d.toJSON(true) : null);");
    if (result == null) {
      return null;
    }
    return collection.docCache.getByDocData(result);
  }

  Stream<RxDocument<RxDocType>?> $() {
    if (subscribed == false) {
      subscribed = true;
      results$ = MergeStream<dynamic>([
        collection.eventBulks$,
        Stream.fromIterable([1])
      ]).asyncMap((event) async {
        var newResult = await exec();
        return newResult;
      });
    }
    return results$;
  }
}

class DocCache<RxDocType> {
  RxCollection<RxDocType> collection;
  Map<String, RxDocument<RxDocType>> map = {};

  DocCache(this.collection);

  RxDocument<RxDocType> getByDocData(dynamic data) {
    String id = data[collection.primaryKey];
    var docInCache = map[id];
    if (docInCache != null) {
      docInCache.data = data;
      return docInCache;
    } else {
      var doc = RxDocument<RxDocType>(collection, data);
      map[id] = doc;
      return doc;
    }
  }

  void updateDocData(String id, dynamic data) {
    var docInCache = map[id];
    if (docInCache != null) {
      docInCache.data = data;
    }
  }
}

abstract class RxDocTypeParent<RxDocType> {
  ///
  /// Will call the [.fromJson] constructor and return a new instance of the
  /// object
  ///
  RxDocType fromJson(dynamic json);
}

double toDouble(double val) {
  return val.toDouble();
}
