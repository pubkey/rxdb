# RxDB Flutter Example

This is an example of how to use [RxDB](https://rxdb.info/) as a database in a [Flutter](https://flutter.dev/) application. It inserts heroes, renders an observed query with a `StreamBuilder`, and removes heroes. All database code is written in Dart, see [lib/main.dart](./lib/main.dart).

Read more in the [RxDB Flutter database documentation](https://rxdb.info/articles/flutter-database.html).

## How it works

The [rxdb Dart package](../../src/plugins/flutter/dart) runs the RxDB JavaScript bundle inside of QuickJS via the [fjs](https://pub.dev/packages/fjs) package and stores the data in SQLite via the [sqlite3](https://pub.dev/packages/sqlite3) package. In your own app, install it from pub.dev with `flutter pub add rxdb`. This example uses the package from this repository with a path dependency.

## Run the example

The JavaScript bundle of the Dart package is generated, so build it first in the root folder of the repository:

```bash
npm install
npm run build:flutter
```

Then start the app:

```bash
cd examples/flutter
flutter run
```

On Linux, fjs compiles QuickJS from Rust sources, so you need a [Rust toolchain](https://rustup.rs/) installed.

## Run the tests

The integration tests run the app and the full test suite of the Dart package with QuickJS on a real Flutter device. On Linux each file has to run on its own:

```bash
flutter test integration_test/app_test.dart -d linux
flutter test integration_test/rxdb_suite_test.dart -d linux
```
