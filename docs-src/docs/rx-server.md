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

Normal RxDB schema indexes get the `_deleted` field prepended because all [RxQueries](./rx-query.md) automatically only search for documents with `_deleted=false`.
When you use RxDB on a server, this might not be optimal because there can be the need to query for documents where the value of `_deleted` does not mather. Mostly this is required in the [pull.stream$](./replication.md#checkpoint-iteration) of a replication.

To set indexes without `_deleted`, you can use the `internalIndexes` field of the schema like the following:

```json
  {
    "version": 0,
    "primaryKey": "id",
    "type": "object",
    "properties": {
        "id": {
            "type": "string",
            "maxLength": 100 // <- the primary key must have set maxLength
        },
        "name": {
            "type": "string",
            "maxLength": 100
        }
    },
    "internalIndexes": [
        ["name", "id"]
    ]
}
```


**NOTICE:** Indexes come with a performance burden. You should only use the indexes you need and make sure you do not accidentally set the `internalIndexes` in your client side [RxCollections](./rx-collection.md).


# Server-only fields



## Missing features

The server plugin is in beta mode and some features are still missing. Make a Pull Request when you need them:

- 





## Query modifier

`RxServerQueryModifier`

NOTICE: For performance reasons the `RxServerQueryModifier` and `RxServerChangeValidator` MUST NOT be async and return a promise. If you need async data to run them, you should gather that data in  the `RxServerAuthHandler` and store it in the auth data to access it later.

## Change validator

`RxServerChangeValidator`




