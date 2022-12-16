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

## make a debugger UI

See https://github.com/pubkey/rxdb/issues/3286
