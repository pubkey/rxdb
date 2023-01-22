# Backlog

This file contains a list with things that should be implemented in the future. If you want to create a PR with one of these things, please create an issue before starting your work, so we can prevent duplication.


## Full Text Search

Add a plugin with full-text-search like
- https://github.com/pouchdb-community/pouchdb-quick-search
- https://docs.mongodb.com/manual/core/index-text/

See [#259](https://github.com/pubkey/rxdb/issues/259)



## Upsert atomic with attachments

See [#494](https://github.com/pubkey/rxdb/issues/494)


## import/export with attachments

See [#1396](https://github.com/pubkey/rxdb/pull/1396#issuecomment-523014106)

## refactor middleware to not be based on side effects

[See](https://github.com/pubkey/rxdb/issues/3426)

## Refactor data-migrator

The current implementation has some flaws and should be completely rewritten.

* It does not use pouchdb's bulkDocs which is much faster
* It could have been written without rxjs and with less code that is easier to understand
* It does not migrate the revisions of documents which causes a problem when replication is used
* It is not able to migrate attachments


## query normalization and optimization

Create a package that normalizes and optimizes mango queries.

optimization: Use $eq instead of $in if $in value has only one item
optimization: if field is an enum use $in instead of other operators with $in: [all enum values that match the operators]
optimization: query always returns empty-array if $eq does not match schema
optimization: detect can-never-match queries (p.e. impossible $eq values or empty $in array)
optimization: merge $and operators

## Add plugin for [Pocketbase](https://pocketbase.io/) replication


## make a debugger UI

See https://github.com/pubkey/rxdb/issues/3286
