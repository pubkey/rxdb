import 'package:flutter/services.dart';
import 'package:flutter_qjs/flutter_qjs.dart';
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
  setToGlobalObject.free();

  await engine.evaluate(plainJsCode);
  var databaseConfigPlain = await engine.evaluate('process.init();');
  var databaseConfig = Map<String, dynamic>.from(databaseConfigPlain);
  print("database config:");
  print(databaseConfig);

  RxDatabase database = new RxDatabase(databaseConfig['databaseName'], engine);

  List<dynamic> collectionNames = databaseConfig['collectionNames'];
  collectionNames.forEach((collectionName) {
    var collection = RxCollection(collectionName, database);
    database.collections[collectionName] = collection;
  });

  return database;
}

class RxDatabase {
  String name;
  FlutterQjs engine;
  Map<String, RxCollection> collections = {};
  RxDatabase(this.name, this.engine) {}

  RxCollection getCollection(String name) {
    var collection = collections[name];
    assert(collection != null, "collection does not exist");
    if (collection == null) {
      throw Exception('collection does not exist');
    } else {
      return collections[name] as RxCollection;
    }
  }
}

class RxCollection {
  String name;
  RxDatabase database;

  RxCollection(this.name, this.database) {}

  RxQuery find(query) {

    var query = new RxQuery();
    return query;
  }

  Future<RxDocument> insert(data) async {
    var result = await this.database.engine.evaluate("process.db['" +
        this.name +
        "'].insert(" +
        jsonEncode(data) +
        ").then(d => d.toString(true));");
    var document = RxDocument(this);
    return document;
  }
}

class RxDocument {
  RxCollection collection;
  RxDocument(this.collection) {}
}

class RxQuery {
  exec(){

  }
}
