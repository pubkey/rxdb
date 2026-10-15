import 'package:flutter/material.dart';
import 'package:rxdb/rxdb.dart';

const Map<String, dynamic> heroSchema = {
  'version': 0,
  'primaryKey': 'id',
  'type': 'object',
  'properties': {
    'id': {'type': 'string', 'maxLength': 100},
    'name': {'type': 'string', 'maxLength': 100},
    'color': {'type': 'string', 'maxLength': 30},
  },
  'required': ['id', 'name', 'color'],
  'indexes': ['name'],
};

Future<RxDatabase> createHeroesDatabase({String name = 'heroes', bool inMemory = false}) {
  return createRxDatabase(
    name: name,
    inMemory: inMemory,
    collections: {
      'heroes': const RxCollectionCreator(schema: heroSchema),
    },
  );
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final database = await createHeroesDatabase();
  runApp(HeroesApp(database: database));
}

class HeroesApp extends StatelessWidget {
  final RxDatabase database;
  const HeroesApp({super.key, required this.database});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'RxDB Flutter Example',
      theme: ThemeData(colorSchemeSeed: Colors.deepPurple),
      home: HeroesPage(collection: database['heroes']),
    );
  }
}

class HeroesPage extends StatefulWidget {
  final RxCollection collection;
  const HeroesPage({super.key, required this.collection});

  @override
  State<HeroesPage> createState() => _HeroesPageState();
}

class _HeroesPageState extends State<HeroesPage> {
  final nameController = TextEditingController();
  final colorController = TextEditingController();

  /// The query result is observed, so the list re-renders
  /// whenever a matching document is inserted, changed or removed.
  late final Stream<List<RxDocument>> heroes$ = widget.collection.find({
    'selector': {},
    'sort': [
      {'name': 'asc'},
    ],
  }).$;

  late final Stream<int> count$ = widget.collection.count().$;

  Future<void> saveHero() async {
    await widget.collection.insert({
      'id': 'hero-${DateTime.now().microsecondsSinceEpoch}',
      'name': nameController.text,
      'color': colorController.text,
    });
    nameController.clear();
    colorController.clear();
  }

  @override
  void dispose() {
    nameController.dispose();
    colorController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: StreamBuilder<int>(
          stream: count$,
          builder: (context, snapshot) => Text('Heroes (${snapshot.data ?? 0})'),
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: StreamBuilder<List<RxDocument>>(
              stream: heroes$,
              builder: (context, snapshot) {
                final docs = snapshot.data ?? const [];
                return ListView.builder(
                  itemCount: docs.length,
                  itemBuilder: (context, index) {
                    final doc = docs[index];
                    final name = doc.get('name') as String;
                    return ListTile(
                      key: Key('list-tile-$name'),
                      title: Text(name),
                      subtitle: Text('color: ${doc.get('color')}'),
                      trailing: IconButton(
                        key: Key('button-delete-$name'),
                        icon: const Icon(Icons.remove_circle),
                        onPressed: () => doc.remove(),
                      ),
                    );
                  },
                );
              },
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    key: const Key('input-name'),
                    controller: nameController,
                    decoration: const InputDecoration(labelText: 'Name'),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: TextField(
                    key: const Key('input-color'),
                    controller: colorController,
                    decoration: const InputDecoration(labelText: 'Color'),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        key: const Key('button-save'),
        onPressed: saveHero,
        tooltip: 'Save',
        child: const Icon(Icons.add),
      ),
    );
  }
}
