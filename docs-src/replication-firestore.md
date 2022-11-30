# Replication with Firestore from Firebase (beta)

With the `replication-firestore` plugin you can do a two-way realtime replication
between your client side [RxDB](./) Database and a [Cloud Firestore](https://firebase.google.com/docs/firestore) database that is hosted on the Firebase platform. It will use the [RxDB Replication Protocol](./replication.md) to manage the replication streams, error- and conflict handling.

<p align="center">
  <img src="./files/alternatives/firebase.svg" alt="Firebase" height="40" />
</p>


Replicating your Firestore state to RxDB can bring multiple benefits compared to using the Firestore directly:
- It can reduce your cloud fees because your queries run against the local state of the documents without touching a server and writes can be batched up locally and send to the backend in bulks. This is mostly the case for read heave applications.
- You can run complex NoSQL queries on your documents because you are not bound to the [Firestore Query](https://firebase.google.com/docs/firestore/query-data/queries) handling. You can also use local indexes, [compression](./key-compression.md) and [encryption](./encryption.md) and do things like fulltext search, fully locally.
- Your application can be truly [Offline-First](./offline-first.md) because your data is stored in a client side database. In contrast Firestore by itself only provides options to support [offline also](https://cloud.google.com/firestore/docs/manage-data/enable-offline) which more works like a cache and requires the user to be online at application start to run authentication.
- It reduces the vendor lock in because you can switch out the backend server afterwards without having to rebuild big parts of the application. RxDB supports replication plugins with multiple technologies and it is even easy to set up with your [custom backend](./replication.md).
- You can use sophisticated [conflict resolution strategies](./replication.md#conflict-handling) so you are not bound to the Firestore [last-write-wins](https://stackoverflow.com/a/47781502/3443137) strategy which is not suitable for many applications.
- The initial load time of your application can be decreased because it will do an incremental replication on restarts.



## Usage

First you have to add the `replication-firestore` plugin to RxDB.

```ts
import { addRxPlugin, createRxDatabase } from 'rxdb';
import { RxDBReplicationFirestorePlugin } from 'rxdb/plugins/replication-firestore';
addRxPlugin(RxDBReplicationFirestorePlugin);
// also create your RxDatabase and RxCollection.
const database = await createRxDatabase({/* ... */});
```

Then you initialize your Firestore database like you would do without RxDB.

```ts
import * as firebase from 'firebase/app';
import {
    getFirestore,
    collection
} from 'firebase/firestore';

const projectId = 'my-project-id';
const app = firebase.initializeApp({
    projectId,
    databaseURL: 'http://localhost:8080?ns=' + projectId,
    /* ... */
});
const firestoreDatabase = getFirestore(app);
const firestoreCollection = collection(firestoreDatabase, 'my-collection-name');
```

Then you can start the replication by calling `syncFirestore()` on your [RxCollection](./rx-collection.md).
```ts
const replicationState = myRxCollection.syncFirestore({
    firestore: {
        projectId,
        database: firestoreDatabase,
        collection: firestoreCollection
    },
    pull: {},
    push: {},
    /**
     * Either do a live or a one-time replication
     * [default=true]
     */
    live: true,
    /**
     * (optional) likely you should just use the default.
     *
     * In firestore it is not possible to read out
     * the internally used write timestamp of a document.
     * Even if we could read it out, it is not indexed which
     * is required for fetch 'changes-since-x'.
     * So instead we have to rely on a custom user defined field
     * that contains the server time which is set by firestore via serverTimestamp()
     * IMPORTANT: The serverTimestampField MUST NOT be part of the collections RxJsonSchema!
     * [default='serverTimestamp']
     */
    serverTimestampField: 'serverTimestamp'
});
```

To observe and cancel the replication, you can use any other methods from the [ReplicationState](./replication.md) like `error$`, `cancel()` and `awaitInitialReplication()`.

## Handling deletes

RxDB requires you to never [fully delete documents](./replication.md#data-layout-on-the-server). This is needed to be able to replicate the deletion state of a document to other instances. The firestore replication will set a boolean `_deleted` field to all documents to indicate the deletion state. You can change this by setting a different `deletedField` in the sync options.

## Do not set `enableIndexedDbPersistence()`

Firestore has the `enableIndexedDbPersistence()` feature which caches document states locally to IndexedDB. This is not needed when you replicate your Firestore with RxDB because RxDB itself will store the data locally already.

## Using the replication with an already existing Firestore Database State

If you have not used RxDB before and you already have documents inside of your Firestore database, you have
to manually set the `_deleted` field to `false` and the `serverTimestamp` to all existing documents.

```ts
import {
    getDocs,
    query,
    serverTimestamp
} from 'firebase/firestore';
const allDocsResult = await getDocs(query(firestoreCollection));
allDocsResult.forEach(doc => {
    doc.update({
        _deleted: false,
        serverTimestamp: serverTimestamp()
    })
});
```

Also notice that if you do writes from non-RxDB applications, you have to keep these fields in sync. It is recommended to use the [Firestore triggers](https://firebase.google.com/docs/functions/firestore-events) to ensure that.
