# Changelog

The rxdb Dart package is released together with the RxDB npm package and has the same version number.
The full list of changes is in the [RxDB changelog](https://github.com/pubkey/rxdb/blob/master/CHANGELOG.md).

## 17.6.0

- Rewrite of the Flutter package: RxDB runs in QuickJS via [fjs](https://pub.dev/packages/fjs) and stores data in SQLite via the [sqlite3](https://pub.dev/packages/sqlite3) package.
- Schemas, queries, observing, documents, local documents, migrations and replication handlers are used directly from Dart, no JavaScript code needed.
