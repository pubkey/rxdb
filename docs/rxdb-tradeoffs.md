TODO this is a draft


# RxDB Tradeoffs

[RxDB](https://rxdb.info) is client-side, offline first Database for JavaScript applications.



## Why no transactions

- Does not work with offline-first
-Does not work with multi-tab

-- Instead of transactions, rxdb works with revisions

## Why not sql

- Javascript is made to work with objects
- Caching and event-reduce

## Why no relations

- Does not work with easy replication

## Why is a schema required

- migration of data on clients is hard
- Why jsonschema

## 
