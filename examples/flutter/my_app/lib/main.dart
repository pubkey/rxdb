import 'package:flutter/material.dart';
import 'package:flutter_qjs/flutter_qjs.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();


  runApp(const MyApp());

  WidgetsFlutterBinding.ensureInitialized();


  final prefs = await SharedPreferences.getInstance();

  
  print('#################');
  print('#################');
  print('#################');
  print('#################');
  print('#################');
  print('#################');

  String plainJsCode = await rootBundle.loadString("javascript/dist/main.js");
  final engine = IsolateQjs(
    stackSize: 1024 * 1024, // change stack size here.
    moduleHandler: (String module) async {
      print('# load flutter Qjs module handler ' + module);
      return await '';
    }
  );
  await Future.delayed(Duration(seconds: 2));


  try {
    print('# running javascript');
    print(plainJsCode);
    print('--------------0');
    print(await engine.evaluate('process = {};'));
    print(await engine.evaluate('window = {};'));
    print(await engine.evaluate('console = {};'));
    print('--------------0.011');
    final setToGlobalObject = await engine.evaluate("(key, val) => { this[key] = val; }");
    await setToGlobalObject.invoke(["setTimeoutWait", (int time) async {
      await Future.delayed(Duration(milliseconds: time));
    }]);
    print('--------------0.01');
    print(await engine.evaluate("""function setTimeout(fn, time) { 
      (async() => {
        await setTimeoutWait(time);
        fn();
      })();
    }"""));
    print('--------------0.02');
    int lastIntervalId = 0;
    List<int> runningIntervals = [];
    await setToGlobalObject.invoke(["setIntervalMapper", (int time) async {
      // Timer.periodic(new Duration(seconds: 1), (timer) {
      //   debugPrint(timer.tick.toString());
      // });
      // TODO
    }]);
    print(await engine.evaluate("""function setInterval(fn, time) { 
    }""")); // TODO
    print('--------------0.03');
    await setToGlobalObject.invoke(["clearIntervalMapper", (int intervalId) async {
      // TODO
    }]);
    print(await engine.evaluate("""function clearInterval(handler) { 
    }""")); // TODO

    print('--------------0.04');
    await setToGlobalObject.invoke(["persistKeyValue", (String key, String value) async {
      print('----------------- persist start');
      await prefs.setString(key, value);
      print('----------------- persist end');
    }]);
    await setToGlobalObject.invoke(["readKeyValue", (String key) async {
      final String? value = prefs.getString(key);
      return value;
    }]);

    print('--------------0.1');
    print(await engine.evaluate("async function getColor(){ new Promise(res => setInterval(() => res('blue'), 100));  }"));
    print('--------------0.2');
    print(await engine.evaluate('getColor();'));
    print('--------------0.3');
    print(await engine.evaluate(plainJsCode));
    print('--------------1');
    print(await engine.evaluate('process.test();'));
    print('--------------1.5');

    print('--------------2.5');
    print(await engine.evaluate('process.run();'));
    print('--------------3');
  } catch (e) {
    print('# running javascript ERROR');
    print(e.toString());
  }
    print('# running javascript DONE');

  print('EEEEEEEEEEEEEEEEEE');
  print('EEEEEEEEEEEEEEEEEE');
  print('EEEEEEEEEEEEEEEEEE');
  print('EEEEEEEEEEEEEEEEEE');
  print('EEEEEEEEEEEEEEEEEE');
  print('EEEEEEEEEEEEEEEEEE');




}

class MyApp extends StatelessWidget {
  const MyApp({super.key});




  // This widget is the root of your application.
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Flutter Demo',
      theme: ThemeData(
        // This is the theme of your application.
        //
        // Try running your application with "flutter run". You'll see the
        // application has a blue toolbar. Then, without quitting the app, try
        // changing the primarySwatch below to Colors.green and then invoke
        // "hot reload" (press "r" in the console where you ran "flutter run",
        // or simply save your changes to "hot reload" in a Flutter IDE).
        // Notice that the counter didn't reset back to zero; the application
        // is not restarted.
        primarySwatch: Colors.blue,
      ),
      home: const MyHomePage(title: 'Flutter Demo Home Page'),
    );
  }
}

class MyHomePage extends StatefulWidget {
  const MyHomePage({super.key, required this.title});

  // This widget is the home page of your application. It is stateful, meaning
  // that it has a State object (defined below) that contains fields that affect
  // how it looks.

  // This class is the configuration for the state. It holds the values (in this
  // case the title) provided by the parent (in this case the App widget) and
  // used by the build method of the State. Fields in a Widget subclass are
  // always marked "final".

  final String title;

  @override
  State<MyHomePage> createState() => _MyHomePageState();
}

class _MyHomePageState extends State<MyHomePage> {
  int _counter = 1;

  void _incrementCounter() {
    setState(() {
      // This call to setState tells the Flutter framework that something has
      // changed in this State, which causes it to rerun the build method below
      // so that the display can reflect the updated values. If we changed
      // _counter without calling setState(), then the build method would not be
      // called again, and so nothing would appear to happen.
      _counter++;
    });
  }

  @override
  Widget build(BuildContext context) {
    // This method is rerun every time setState is called, for instance as done
    // by the _incrementCounter method above.
    //
    // The Flutter framework has been optimized to make rerunning build methods
    // fast, so that you can just rebuild anything that needs updating rather
    // than having to individually change instances of widgets.
    return Scaffold(
      appBar: AppBar(
        // Here we take the value from the MyHomePage object that was created by
        // the App.build method, and use it to set our appbar title.
        title: Text(widget.title),
      ),
      body: Center(
        // Center is a layout widget. It takes a single child and positions it
        // in the middle of the parent.
        child: Column(
          // Column is also a layout widget. It takes a list of children and
          // arranges them vertically. By default, it sizes itself to fit its
          // children horizontally, and tries to be as tall as its parent.
          //
          // Invoke "debug painting" (press "p" in the console, choose the
          // "Toggle Debug Paint" action from the Flutter Inspector in Android
          // Studio, or the "Toggle Debug Paint" command in Visual Studio Code)
          // to see the wireframe for each widget.
          //
          // Column has various properties to control how it sizes itself and
          // how it positions its children. Here we use mainAxisAlignment to
          // center the children vertically; the main axis here is the vertical
          // axis because Columns are vertical (the cross axis would be
          // horizontal).
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
