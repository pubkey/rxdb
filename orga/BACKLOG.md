# Backlog

This file contains a list with things that should be implemented in the future. If you want to create a PR with one of these things, please create an issue before starting your work, so we can prevent duplication.


## RxServer MCP Server endpoint

https://news.ycombinator.com/item?id=45622604

## database viewer plugin

Something where devs can open a UI to inspect the locally stored data.

## Storage based on ReactNative-MMKV

https://github.com/mrousavy/react-native-mmkv

## PostgreSQL RxStorage

https://github.com/thomas4019/mongo-query-to-postgres-jsonb

https://news.ycombinator.com/item?id=45885768

## PGLite RxStorage

Like https://github.com/XuHaoJun/rxdb-storage-pglite

## refactor middleware to not be based on side effects

[See](https://github.com/pubkey/rxdb/issues/3426)

## tool to generate sync enpoints in swagger

## update+delete in one operation

## Redis Sync

Similar to the NATS replication plugin.

## Use zero-copy datastructures when return data from OPFS

This might be faster because we have binary arrays already in OPFS and then we
do not have to transfer big json strings to the main thread. Must be tested for performance first.

## query normalization and optimization

Create a package that normalizes and optimizes mango queries.

- optimization: Use $eq instead of $in if $in value has only one item
- optimization: if field is an enum use $in instead of other operators with $in: [all enum values that match the operators]
- optimization: query always returns empty-array if $eq does not match schema
- optimization: detect can-never-match queries (p.e. impossible $eq values or empty $in array)
- optimization: merge $and operators
- Use index for $regex query if possible https://www.mongodb.com/docs/manual/reference/operator/query/regex/#index-use
- If $eq on primaryKey and has other operators, use a find-by-id and the filter the results on the query operators.

## Use JSON1 in SQLITE when it is supported in native android

https://www.powersync.com/blog/sqlite-optimizations-for-ultra-high-performance

## Add plugin for postgREST replication

[https://docs.postgrest.org/](https://docs.postgrest.org/)

## Add plugin for [Pocketbase](https://pocketbase.io/) replication

## make a debugger UI

See https://github.com/pubkey/rxdb/issues/3286
