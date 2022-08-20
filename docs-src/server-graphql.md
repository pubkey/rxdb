# GraphQL Server Plugin (beta)

The GraphQL server plugin can be used on Node.js to spawn a GraphQL server that is compatible to the [RxDB GraphQL Replication](./replication-graphql.md). It makes it easy to replicate data between multiple servers that all use RxDB on the same database state.

**NOTICE**: The GraphQL server plugin does not have any concept for permission handling. It is designed to create an easy **server-to-server** replication. It is not made for client-server replication at the moment.
