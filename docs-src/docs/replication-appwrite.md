---
title: Appwrite Realtime Sync for Local-First Apps
slug: replication-appwrite.html
description: Sync RxDB with Appwrite for local-first apps. Supports real-time updates, offline mode, conflict resolution, and secure push/pull replication.
---

import {Tabs} from '@site/src/components/tabs';
import {Steps} from '@site/src/components/steps';
import {YouTubeVideoBox} from '@site/src/components/youtube-video-box';
import {RxdbMongoDiagramPlain} from '@site/src/components/mongodb-sync';



# RxDB Appwrite Replication (beta)

This replication plugin allows you to synchronize documents between RxDB and an <a href="https://appwrite.io/" rel="noopener nofollow">Appwrite</a> server. It supports both push and pull replication, live updates via Appwrite's real-time subscriptions, [offline-capability](./offline-first.md) and [conflict resolution](./transactions-conflicts-revisions.md).

<br />
<center>
    <YouTubeVideoBox videoId="L07xPMyL8sY" title="Appwrite in 100 Seconds" duration="2:35" />
</center>


## Why you should use RxDB with Appwrite?

**Appwrite** is a secure, open-source backend server that simplifies backend tasks like user authentication, storage, database management, and real-time APIs.  
**RxDB** is a reactive database for the frontend that offers offline-first capabilities and rich client-side data handling.

Combining the two provides several benefits:

1. [Offline-First](./offline-first.md): RxDB keeps all data locally, so your application remains fully functional even when the network is unavailable. When connectivity returns, the RxDB ↔ Appwrite replication automatically resolves and synchronizes changes.

2. **Real-Time Sync**: With Appwrite’s real-time subscriptions and RxDB’s live replication, you can build collaborative features that update across all clients instantaneously.

3. [Conflict Handling](./transactions-conflicts-revisions.md): RxDB offers flexible conflict resolution strategies, making it simpler to handle concurrent edits across multiple users or devices.

4. **Scalable & Secure**: Appwrite is built to handle production loads with granular access controls, while RxDB easily scales across various storage backends on the client side.

5. **Simplicity & Modularity**: RxDB’s plugin-based architecture, combined with Appwrite’s Cloud offering makes it one of the easiest way to build local-first [realtime apps](./articles/realtime-database.md) that scale.

<br />
<br />

<RxdbMongoDiagramPlain showServer={false} dbIcon="/files/icons/appwrite.svg" dbLabel="" />


## Preparing the Appwrite Server

You can either use the appwrite cloud or <a href="https://appwrite.io/docs/advanced/self-hosting" rel="noopener nofollow">self-host the Appwrite server</a>. In this tutorial we use the Cloud which is recommended for beginners because it is way easier to set up. You can later decide to self-host if needed.

<Steps>

### Set up an Appwrite Endpoint and Project

<Tabs>

#### Self-Hosted Appwrite Instance

<Steps>

##### Docker

Ensure docker and docker-compose is installed and your version are up to date:

```bash
docker-compose -v
```

##### Run the installation script

The installation script runs inside of a docker container. It will create a docker-compose file and an `.env` file.

```bash
docker run -it --rm \
    --volume /var/run/docker.sock:/var/run/docker.sock \
    --volume "$(pwd)"/appwrite:/usr/src/code/appwrite:rw \
    --entrypoint="install" \
    appwrite/appwrite:1.6.1
```

##### Start/Stop

After the installation is done, you can manually stop and start the appwrite instance with docker compose:

```bash
# stop
docker-compose down

# start
docker-compose up
```

</Steps>


#### Appwrite Cloud

<Steps>

##### Create a Cloud Account

Got to the <a href="ttps://cloud.appwrite.io/console/login" rel="noopener nofollow">Appwrite Console</a>, create an account and login.

#### Create a Project

At the <a href="https://cloud.appwrite.io/console/" rel="noopener nofollow">console</a> click the `+ Create Project` button to create a new project. Remember the `project-id` which will be used later.

</Steps>


</Tabs>

### Create an Appwrite Database and Collection

After creating an Appwrite project you have to create an Appwrite Database and a collection, you can either do this in code with the <a href="https://appwrite.io/docs/products/databases/databases" rel="noopener nofollow">node-appwrite SDK</a> or in the <a href="https://cloud.appwrite.io/console/" rel="noopener nofollow">Appwrite Console</a> as shown in this video:

<center>
    <YouTubeVideoBox videoId="HGlBpna17LQ" title="Appwrite Database Tutorial" duration="9:47" startAt={328} />
</center>
<br />

### Add your documents attributes

In the appwrite collection, create all <a href="https://appwrite.io/docs/products/databases/collections#attributes" rel="noopener nofollow">attributes</a> of your documents. You have to define all the fields that your document in your [RxDB schema](./rx-schema.md) knows about. Notice that Appwrite does not allow for nested attributes. So when you use RxDB with Appwrite, you should also not have nested attributes in your RxDB schema.

### Add a `deleted` attribute

Appwrite (natively) hard-deletes documents. But for offline-handling RxDB needs soft-deleted documents on the server so that the deletion state can be replicated with other clients.

In RxDB, `_deleted` indicates that a document is removed locally and you need a similar field in your Appwrite collection on the Server: You must define a deletedField with any name to mark documents as "deleted" in the remote collection. Mostly you would use a boolean field named `deleted` (set it to `required`). The plugin will treat any document with `{ [deletedField]: true }` as deleted and replicate that state to local RxDB.

### Set the Permission on the Appwrite Collection

Appwrite uses permissions to control data access on the collection level. Make sure that in the Console at `Collection -> Settings -> Permissions` you have set the permission according to what you want to allow your clients to do. For testing, just enable all of them (Create, Read, Update and Delete).

</Steps>



## Setting up the RxDB - Appwrite Replication

Now that we have set up the Appwrite server, we can go to the client side code and set up RxDB and the replication:

<Steps>

### Install the Appwrite SDK and RxDB:

```bash
npm install appwrite rxdb
```

### Import the Appwrite SDK and RxDB

```ts
import {
    replicateAppwrite
} from 'rxdb/plugins/replication-appwrite';
import {
    createRxDatabase,
    addRxPlugin,
    RxCollection
} from 'rxdb/plugins/core';
import {
    getRxStorageLocalstorage
} from 'rxdb/plugins/storage-localstorage';

import { Client } from 'appwrite';
```

### Create a Database with a Collection

```ts
const db = await createRxDatabase({
    name: 'mydb',
    storage: getRxStorageLocalstorage()
});
const mySchema = {
    title: 'my schema',
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: {
            type: 'string',
            maxLength: 100
        },
        name: {
            type: 'string'
        }
    },
    required: ['id', 'name']
};
await db.addCollections({
    humans: {
        schema: mySchema
    }
});
const collection = db.humans;
```


### Configure the Appwrite Client

<Tabs>

#### Appwrite Cloud

```ts
const client = new Client();
client.setEndpoint('https://cloud.appwrite.io/v1');
client.setEndpointRealtime('https://cloud.appwrite.io/v1');
client.setProject('YOUR_APPWRITE_PROJECT_ID');
```

#### Self-Hosted

```ts
const client = new Client();
client.setEndpoint('http://localhost/v1');
client.setEndpointRealtime('http://localhost/v1');
client.setProject('YOUR_APPWRITE_PROJECT_ID');
```


</Tabs>


### Start the Replication

```ts
const replicationState = replicateAppwrite({
    replicationIdentifier: 'my-appwrite-replication',
    client,
    databaseId: 'YOUR_APPWRITE_DATABASE_ID',
    collectionId: 'YOUR_APPWRITE_COLLECTION_ID',
    deletedField: 'deleted', // Field that represents deletion in Appwrite
    collection,
    pull: {
        batchSize: 10,
    },
    push: {
        batchSize: 10
    },
    /*
     * ...
     * You can set all other options for RxDB replication states
     * like 'live' or 'retryTime'
     * ...
     */
});
```

### Do other things with the replication state

The `RxAppwriteReplicationState` which is returned from `replicateAppwrite()` allows you to run all functionality of the normal [RxReplicationState](./replication.md).

</Steps>

<p align="center">
  <img src="./files/icons/appwrite.svg" alt="Appwrite Sync" 
  height="60" />
</p>



## Limitations of the Appwrite Replication Plugin

- Appwrite primary keys only allow for the characters `a-z`, `A-Z`, `0-9`, and underscore `_` (They cannot start with a leading underscore). Also the primary key has a max length of 36 characters.
- The Appwrite replication **only works on browsers**. This is because the Appwrite SDK does not support subscriptions in Node.js.
- Appwrite does not allow for bulk write operations so on push one HTTP request will be made per document. Reads run in bulk so this is mostly not a problem.
- Appwrite does not allow for transactions or "update-if" calls which can lead to overwriting documents instead of properly handling [conflicts](./transactions-conflicts-revisions.md#conflicts) when multiple clients edit the same document in parallel. This is not a problem for inserts because "insert-if-not" calls are made.
- Nested attributes in Appwrite collections are only possible via experimental <a href="https://appwrite.io/docs/products/databases/relationships" rel="noopener nofollow">relationship attributes</a>, and compatibility with RxDB is not tested. Users opting to use these experimental relationship attributes with RxDB do so at their own risk.
