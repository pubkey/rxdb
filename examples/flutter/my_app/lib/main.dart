import 'package:flutter/material.dart';
import 'package:flutter_qjs/flutter_qjs.dart';
import 'package:flutter/services.dart';
import 'package:my_app/rxdb.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await RxDatabaseState.init();
  const app = MyApp();
  app.initJavaScript();
  runApp(app);
}

class RxHeroDocType {
  final String id, name, color;
  RxHeroDocType({required this.id, required this.name, required this.color});
}

class RxCollectionsOfDatabase {
  late RxCollection<RxHeroDocType> heroes;
}

class RxDatabaseState {
  static late RxDatabase database;
  static bool initDone = false;
  static late RxCollection<RxHeroDocType> collection;

  static Future<RxDatabase> init() async {
    if (initDone) {
      return database;
    }
    initDone = true;
    database = await getRxDatabase("javascript/dist/main.js");
    collection = database.getCollection<RxHeroDocType>('heroes');
    return database;
  }
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  void initJavaScript() async {
    print('#################');
    print('#################');
    print('#################');
    print('#################');
    print('#################');
    print('#################');

    var collection = RxDatabaseState.collection;

    var document = await collection.insert({
      "id": "foo" + new DateTime.now().toString(),
      "name": "Alice",
      "color": "blue"
    });

    print("doc value: " + document.data['color']);

    var query = collection.find({});
    var existingDocs = await query.exec();
    print("existing docs:");
    print(existingDocs);
    existingDocs.forEach((element) {
      print("doc " + element.data['id']);
    });

    print('EEEEEEEEEEEEEEEEEE');
    print('EEEEEEEEEEEEEEEEEE');
    print('EEEEEEEEEEEEEEEEEE');
    print('EEEEEEEEEEEEEEEEEE');
    print('EEEEEEEEEEEEEEEEEE');
    print('EEEEEEEEEEEEEEEEEE');
  }

  // This widget is the root of your application.
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Flutter Demo',
      theme: ThemeData(
        primarySwatch: Colors.blue,
      ),
      home: const MyHomePage(title: 'Flutter Demo Home Page'),
    );
  }
}

class MyHomePage extends StatefulWidget {
  const MyHomePage({super.key, required this.title});
  final String title;

  @override
  State<MyHomePage> createState() => _MyHomePageState();
}

class _MyHomePageState extends State<MyHomePage> {
  RxQuery<RxHeroDocType> query = RxDatabaseState.collection.find({});
  List<RxDocument<RxHeroDocType>> documents = [];
  int _counter = 1;

  _MyHomePageState() {
    query.$().listen((newResults) {
      print("SSSSSSSSSSSSSSSSSSSS got new results");
      print(newResults);
      documents = newResults;
    });
  }

  void _incrementCounter() {
    setState(() {
      _counter++;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.title),
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: <Widget>[
            const Text(
              'You have clicked the button this many times:',
            ),
            Text(
              '$_counter',
              style: Theme.of(context).textTheme.headline4,
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _incrementCounter,
        tooltip: 'Increment',
        child: const Icon(Icons.add),
      ), // This trailing comma makes auto-formatting nicer for build methods.
    );
  }
}
