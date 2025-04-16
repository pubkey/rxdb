# Backlog

This file contains a list with things that should be implemented in the future. If you want to create a PR with one of these things, please create an issue before starting your work, so we can prevent duplication.


## PostgreSQL RxStorage

https://github.com/thomas4019/mongo-query-to-postgres-jsonb

## PGLite RxStorage

Like https://github.com/XuHaoJun/rxdb-storage-pglite

## Zero-Sync replication plugin

https://www.youtube.com/watch?v=hAxdOUgjctk&ab_channel=Syntax

## Upsert atomic with attachments

See [#494](https://github.com/pubkey/rxdb/issues/494)


## import/export with attachments

See [#1396](https://github.com/pubkey/rxdb/pull/1396#issuecomment-523014106)

## refactor middleware to not be based on side effects

[See](https://github.com/pubkey/rxdb/issues/3426)

## tool to generate sync enpoints in swagger

## Redis Sync

Similar to the NATS replication plugin.

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

## Add plugin for attachments compression

Attachments can get quite big. Use compression when the api is available on firefox: https://caniuse.com/?search=compressionstream

## Add plugin for [Pocketbase](https://pocketbase.io/) replication


## make a debugger UI

See https://github.com/pubkey/rxdb/issues/3286
