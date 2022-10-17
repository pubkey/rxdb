import 'package:flutter/services.dart';
import 'package:flutter_qjs/flutter_qjs.dart';
import 'package:rxdart/rxdart.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';

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

  RxDatabase database =
      new RxDatabase(databaseConfig['databaseName'], engine, events);

  var configCollectionsMetaJson = databaseConfig['collections'];
  if (configCollectionsMetaJson == null) {
    throw Exception('no collection meta given');
  }
  print(configCollectionsMetaJson);
  for (var collectionMeta in configCollectionsMetaJson) {
    String collectionName = collectionMeta['name'];
    String collectionPrimaryKey = collectionMeta['primaryKey'];
    var collection =
        RxCollection(collectionName, database, collectionPrimaryKey);
    database.collections[collectionName] = collection;
  }

  return database;
}

class RxDatabase<CollectionsOfDatabase> {
  String name;
  FlutterQjs engine;
  Map<String, RxCollection<dynamic>> collections = {};
  ReplaySubject events;
  RxDatabase(this.name, this.engine, this.events);

  RxCollection<RxDocType> getCollection<RxDocType>(String name) {
    var collection = collections[name];
    assert(collection != null, "collection does not exist");
    if (collection == null) {
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
    docCache = DocCache(this);
  }

  RxQuery find(query) {
    var query = RxQuery();
    return query;
  }

  Future<RxDocument<RxDocType>> insert(data) async {
    var result = await database.engine.evaluate("process.db['" +
        name +
        "'].insert(" +
        jsonEncode(data) +
        ").then(d => d.toJSON(true));");
    var document = docCache.getByDocData(result);
    return document;
  }
}

class RxDocument<RxDocType> {
  RxCollection collection;
  RxDocType data;
  RxDocument(this.collection, this.data);
}

class RxQuery {
  exec() {}
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
      return doc;
    }
  }
}
