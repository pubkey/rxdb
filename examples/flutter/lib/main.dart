import 'package:flutter/material.dart';
import 'package:flutter_qjs/flutter_qjs.dart';
import 'package:flutter/services.dart';
import 'package:my_app/rxdb.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await RxDatabaseState.init();
  const app = MyApp();
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
  final nameController = TextEditingController();
  final colorController = TextEditingController();

  _MyHomePageState() {
    query.$().listen((newResults) {
      setState(() {
        documents = newResults;
      });
    });
  }

  void saveNewHero() async {
    print("saveNewHero() called");
    var collection = RxDatabaseState.collection;
    await collection.insert({
      "id": "zflutter-${DateTime.now()}",
      "name": nameController.text,
      "color": colorController.text
    });
    nameController.clear();
    colorController.clear();
  }

  void removeHero(RxDocument<RxHeroDocType> heroDocument) async {
    print("removeHero() called");
    await heroDocument.remove();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.title),
      ),
      body: Column(
        children: [
          SizedBox(
            height: 400,
            child: ListView.builder(
                scrollDirection: Axis.vertical,
                itemCount: documents.length,
                itemBuilder: (BuildContext ctxt, int index) {
                  return Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: ListTile(
                            leading: Text(documents[index].data['name']),
                            title: Text(
                                'color: ' + documents[index].data['color'])),
                      ),
                      IconButton(
                        icon: const Icon(Icons.remove_circle),
                        onPressed: () {
                          documents[index].remove();
                        },
                      )
                    ],
                  );
                }),
          ),
          SizedBox(
            width: 300,
            height: 100,
            child: TextField(
              controller: nameController,
              decoration: const InputDecoration(
                border: OutlineInputBorder(),
                labelText: 'Name',
              ),
            ),
          ),
          SizedBox(
            width: 300,
            child: TextField(
              controller: colorController,
              decoration: const InputDecoration(
                border: OutlineInputBorder(),
                labelText: 'Color',
              ),
            ),
          )
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: saveNewHero,
        tooltip: 'Save',
        child: const Icon(Icons.add),
      ), // This trailing comma makes auto-formatting nicer for build methods.
    );
  }
}
