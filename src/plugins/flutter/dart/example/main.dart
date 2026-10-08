// A full Flutter example app is at
// https://github.com/pubkey/rxdb/tree/master/examples/flutter
import 'package:flutter/material.dart';
import 'package:rxdb/rxdb.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final db = await createRxDatabase(
    name: 'exampledb',
    collections: {
      'todos': const RxCollectionCreator(
        schema: {
          'version': 0,
          'primaryKey': 'id',
          'type': 'object',
          'properties': {
            'id': {'type': 'string', 'maxLength': 100},
            'title': {'type': 'string'},
            'done': {'type': 'boolean'},
          },
          'required': ['id', 'title', 'done'],
        },
      ),
    },
  );
  runApp(MaterialApp(home: TodoList(todos: db['todos'])));
}

class TodoList extends StatelessWidget {
  final RxCollection todos;
  const TodoList({super.key, required this.todos});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('RxDB Todos')),
      body: StreamBuilder<List<RxDocument>>(
        stream: todos.find().$,
        builder: (context, snapshot) {
          final docs = snapshot.data ?? const [];
          return ListView(
            children: docs
                .map(
                  (doc) => CheckboxListTile(
                    title: Text(doc.get('title') as String),
                    value: doc.get('done') as bool,
                    onChanged: (value) => doc.incrementalPatch({'done': value}),
                  ),
                )
                .toList(),
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => todos.insert({
          'id': DateTime.now().microsecondsSinceEpoch.toString(),
          'title': 'Todo ${DateTime.now()}',
          'done': false,
        }),
        child: const Icon(Icons.add),
      ),
    );
  }
}
