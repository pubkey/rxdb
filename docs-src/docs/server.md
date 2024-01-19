# RxDB Server

The RxDB Server Plugin makes it possible to spawn a server on top of a RxDB database that offers multiple types of endpoints for various usages. It can spawn basic CRUD REST endpoints or event realtime replication endpoints that can be used by the client devices to replicate data. 


# Replication Endpoint

The replication endpoint allows clients that connect to it to replicate data with the server via the RxDB [replication protocol](./replication.md). There is also the [Replication Server](./replication-server.md) plugin that is used on the client side to connect to the endpoint.


# REST endpoint


# 

- Authentication (who are you) with the authHandler
- authorization with queryModifier and changeValidator
- cors
- conflict detection with the conflictHandler

# Server-only indexes

# Server-only fields



## Missing features

The server plugin is in beta mode and some features are still missing. Make a Pull Request when you need them:

- 












