import 'package:flutter/services.dart';
import 'package:flutter_qjs/flutter_qjs.dart';
import 'package:rxdart/rxdart.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import 'package:json_annotation/json_annotation.dart';

Future<RxDatabase> getRxDatabase(String jsFilePath) async {
  String plainJsCode = await rootBundle.loadString(jsFilePath);
  FlutterQjs engine = FlutterQjs(stackSize: 1024 * 1024);
  engine.dispatch();
  final prefs = await SharedPreferences.getInstance();

  // extend the JavaScript runtime with some missing stuff.
  await engine.evaluate('process = {};');
  await engine.evaluate('window = {};');
  await engine.evaluate('console = {};');
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

  ReplaySubject events = ReplaySubject();
  await setToGlobalObject.invoke([
    "sendRxDBEvent",
    (String eventJSON) async {
      var data = jsonDecode(eventJSON);
      events.add(data);
    }
  ]);

  setToGlobalObject.free();

  await engine.evaluate(plainJsCode);
  var databaseConfigPlain = await engine.evaluate('process.init();');
  var databaseConfig = Map<String, dynamic>.from(databaseConfigPlain);
  print("database config:");
  print(databaseConfig);

  var configCollectionsMetaJson = databaseConfig['collections'];
  if (configCollectionsMetaJson == null) {
    throw Exception('no collection meta given');
  }

  RxDatabase database = new RxDatabase(databaseConfig['databaseName'], engine,
      events, configCollectionsMetaJson);

  print(configCollectionsMetaJson);

  return database;
}

class RxDatabase<CollectionsOfDatabase> {
  String name;
  FlutterQjs engine;
  List<dynamic> collectionMeta;
  Map<String, RxCollection<dynamic>> collections = {};
  ReplaySubject events;
  RxDatabase(this.name, this.engine, this.events, this.collectionMeta);

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

  RxCollection(this.name, this.database, this.primaryKey) {
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
}

class RxQuery<RxDocType> {
  dynamic query;
  RxCollection<RxDocType> collection;
  RxQuery(this.query, this.collection);
  Future<List<RxDocument<RxDocType>>> exec() async {
    List<dynamic> result = await collection.database.engine.evaluate(
        "process.db['" +
            collection.name +
            "'].find(" +
            jsonEncode(query) +
            ").exec().then(docs => docs.map(d => d.toJSON(true)));");

    var ret = result.map((docData) {
      var doc = collection.docCache
          .getByDocData(docData);
      return doc;
    }).toList();

    return ret;
  }
}

class DocCache<RxDocType> {
  RxCollection<RxDocType> collection;
  Map<String, RxDocument<RxDocType>> map = {};

  DocCache(this.collection);

  RxDocument<RxDocType> getByDocData(dynamic data) {
    String id = jsonDecode(jsonEncode(data))[collection.primaryKey];
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
