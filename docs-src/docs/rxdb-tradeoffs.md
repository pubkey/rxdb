---
title: RxDB Tradeoffs - Why NoSQL Triumphs on the Client
slug: rxdb-tradeoffs.html
description: Uncover RxDB's approach to modern database needs. From JSON-based queries to conflict handling without transactions, learn RxDB's unique tradeoffs.
image: /headers/rxdb-tradeoffs.jpg
---

# RxDB Tradeoffs

[RxDB](https://rxdb.info) is client-side, [offline first](./offline-first.md) Database for JavaScript applications.
While RxDB could be used on the server side, most people use it on the client side together with an UI based application.
Therefore RxDB was optimized for client side applications and had to take completely different tradeoffs than what a server side database would do.


## Why not SQL syntax

When you ask people which database they would want for browsers, the most answer I hear is *something SQL based like SQLite*.
This makes sense, SQL is a query language that most developers had learned in school/university and it is reusable across various database solutions. 
But for RxDB (and other client side databases), using SQL is not a good option and instead it operates on document writes and the JSON based **[Mango-query](https://github.com/cloudant/mango)** syntax for querying.

```ts
// A Mango Query
const query = {
    selector: {
        age: {
            $gt: 10
        },
        lastName: 'foo'
    },
    sort: [{ age: 'asc' }]
};
```

### SQL is made for database servers

SQL is made to be used to run operations against a database server. You send a SQL string like ```SELECT SUM(column_name)...``` to the database server and the server then runs all operations required to calculate the result and only send back that result.
This saves performance on the application side and ensures that the application itself is not blocked.

But RxDB is a client-side database that runs **inside** of the application. There is no performance difference if the `SUM()` query is run inside of the database or at the application level where a `Array.reduce()` call calculates the result.

### Typescript support

SQL is `string` based and therefore you need additional IDE tooling to ensure that your written database code is valid.
Using the Mango Query syntax instead, TypeScript can be used validate the queries and to autocomplete code and knows which fields do exist and which do not. By doing so, the correctness of queries can be ensured at compile-time instead of run-time.

<p align="center">
  <img src="./files/typescript-query-validation.png" alt="TypeScript Query Validation" />
</p>


### Composeable queries

By using JSON based Mango Queries, it is easy to compose queries in plain JavaScript.
For example if you have any given query and want to add the condition `user MUST BE 'foobar'`, you can just add the condition to the selector without having to parse and understand a complex SQL string.

```ts
query.selector.user = 'foobar';
```

Even merging the selectors of multiple queries is not a problem:

```ts
queryA.selector = {
    $and: [
        queryA.selector,
        queryB.selector
    ]
};
```


## Why Document based (NoSQL)

Like other NoSQL databases, RxDB operates data on document level. It has no concept of tables, rows and columns. Instead we have collections, documents and fields.

### Javascript is made to work with objects
### Caching 

### EventReduce

### Easier to use with typescript 

Because of the document based approach, TypeScript can know the exact type of the query response while a SQL query could return anything from a number over a set of rows or a complex construct.



## Why no transactions

- Does not work with offline-first
- Does not work with multi-tab
- Easier conflict handling on document level

-- Instead of transactions, rxdb works with revisions


## Why no relations

- Does not work with easy replication

## Why is a schema required

- migration of data on clients is hard
- Why jsonschema

## 

