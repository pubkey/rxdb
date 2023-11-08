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
  dynamic previousDocumentData;
  String documentId;
  String? collectionName;
  bool isLocal;
  RxChangeEvent(
      this.operation,
      this.previousDocumentData,
      this.documentId,
      this.collectionName,
      this.isLocal
  );

  static RxChangeEvent<RxDocType> fromJSON<RxDocType>(dynamic json) {
    RxChangeEvent<RxDocType> ret = RxChangeEvent<RxDocType>(
        json['operation'],
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

  RxChangeEventBulk(
      this.collectionName,
      this.id,
      this.databaseToken,
      this.storageToken,
      this.internal,
      this.events,
      this.checkpoint,
      this.context);

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
        json['context']);
    return ret;
  }
}

class RxDatabase<CollectionsOfDatabase> {
  String name;
  FlutterQjs engine;
  List<dynamic> collectionMeta;
  Map<String, RxCollection<dynamic>> collections = {};
  ReplaySubject<RxChangeEventBulk<dynamic>> eventBulks$;
  RxDatabase(this.name, this.engine, this.eventBulks$, this.collectionMeta);

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

  RxQuery<RxDocType> find(dynamic query) {
    var rxQuery = RxQuery<RxDocType>(query, this);
    return rxQuery;
  }

  Future<RxDocument<RxDocType>> insert(data) async {
    dynamic result = await database.engine.evaluate("process.db['" +
        name +
        "'].insert(" +
        jsonEncode(data) +
        ").then(d => d.toJSON(true));");
    var document = docCache.getByDocData(result);
    return document;
  }
}

class RxDocument<RxDocType> {
  RxCollection<RxDocType> collection;
  dynamic data;
  RxDocument(this.collection, this.data);

  Future<RxDocument<RxDocType>> remove() async {
    String id = data[collection.primaryKey];
    await collection.database.engine.evaluate("process.db['" +
        collection.name +
        "'].findOne('" +
        id +
        "').exec().then(d => d.remove());");
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
        "process.db['" +
            collection.name +
            "'].find(" +
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

class DocCache<RxDocType> {
  RxCollection<RxDocType> collection;
  Map<String, RxDocument<RxDocType>> map = {};

  DocCache(this.collection);

  RxDocument<RxDocType> getByDocData(dynamic data) {
    String id = data[collection.primaryKey];
    var docInCache = map[id];
    if (docInCache != null) {
      return docInCache;
    } else {
      var doc = RxDocument<RxDocType>(collection, data);
      map[id] = doc;
      return doc;
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
