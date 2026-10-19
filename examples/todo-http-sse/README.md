# RxDB Todo App with a Custom Node.js Sync Server (HTTP + Server-Sent Events)

A local-first todo app built with [RxDB](https://rxdb.info/) and plain TypeScript. It stores the todos in IndexedDB through the [Dexie.js RxStorage](https://rxdb.info/rx-storage-dexie.html) and replicates them to a self-written Node.js server with the [HTTP replication](https://rxdb.info/replication-http.html). The server pushes ongoing changes to all clients with Server-Sent Events (SSE).

The app works offline. Writes go to the local database first and are pushed as soon as the server is reachable again. When two devices edit the same todo while offline, a custom conflict handler merges both changes.

## Features

- **Dexie.js storage**: The todos are stored in IndexedDB with [getRxStorageDexie()](https://rxdb.info/rx-storage-dexie.html).
- **Key compression**: The [key-compression plugin](https://rxdb.info/key-compression.html) replaces the property names with short ones before they are written to disk.
- **Encryption**: The `title` field is encrypted at rest with the [encryption-crypto-js plugin](https://rxdb.info/encryption.html).
- **Schema validation**: Every write is validated with [validate-ajv](https://rxdb.info/schema-validation.html).
- **Leader election**: With multiple browser tabs open, only the [leader](https://rxdb.info/leader-election.html) runs the replication. The other tabs get the changes over the BroadcastChannel.
- **Cleanup**: The [cleanup plugin](https://rxdb.info/cleanup.html) removes deleted todos from the local storage after they have been replicated.
- **Dev-mode**: The [dev-mode plugin](https://rxdb.info/dev-mode.html) is loaded only in development (`import.meta.env.DEV`).
- **Custom sync server**: [server/server.ts](./server/server.ts) uses only the Node.js `http` module. It has a pull endpoint, a push endpoint with conflict detection, and an SSE endpoint for the pull stream.
- **Conflict handling**: [conflict-handler.ts](./src/client/conflict-handler.ts) runs a three-way merge per field.

## Run it

```bash
npm run preinstall   # packs the local RxDB build into rxdb-local.tgz
npm install
npm run dev
```

`npm run dev` starts the sync server on port `3000` and the Vite dev server on port `5173`. Vite forwards all `/api` requests to the sync server, so the browser only talks to one origin.

Open [http://localhost:5173](http://localhost:5173) in two different browser profiles (or one normal and one private window). Each profile has its own IndexedDB, so they behave like two devices.

To see the conflict handler in action:

1. Click **Go offline** in both windows.
2. Rename a todo in the first window (double-click the title).
3. Mark the same todo as done in the second window.
4. Click **Go online** in the first window, then in the second one.

Both windows now show the renamed todo as done, and the second window lists the resolved conflict.

In your own app, install `rxdb` from npm instead of the local build: `npm install rxdb rxjs`.

## Tests

```bash
npm test
```

The tests in [test/sync.test.ts](./test/sync.test.ts) start the sync server and two RxDB clients in Node.js. Each client gets its own [fake-indexeddb](https://github.com/dumbmatter/fakeIndexedDB) instance and uses the [eventsource](https://github.com/EventSource/eventsource) package for SSE. They check that:

- a new todo reaches the other device over the SSE pull stream,
- the title is stored encrypted and the keys are compressed in IndexedDB,
- concurrent offline edits are merged by the conflict handler,
- a deletion wins over an offline edit,
- a device that was offline catches up with more than one batch of changes,
- the server rejects invalid push requests.

## How the replication works

### Checkpoints

The server gives every write a strictly increasing sequence number (`seq`). The checkpoint of the replication is `{ seq }` of the last document the client has seen. The pull endpoint returns all documents with a higher `seq`, sorted by `seq`:

```
GET /api/todos/pull?seq=42&batchSize=50
-> { "documents": [...], "checkpoint": { "seq": 61 } }
```

Using a server-side sequence instead of the `updatedAt` time of the client is important. Client clocks can be wrong, and two clients can write at the same millisecond.

### Push and conflict detection

The client sends an array of rows. Each row contains the new document state and the state that the client assumes is currently stored on the server (`assumedMasterState`):

```
POST /api/todos/push
[{ "assumedMasterState": {...}, "newDocumentState": {...} }]
-> [ ...conflicting server documents ]
```

When the assumed state is not equal to the real server state, the server does not write the row and returns the real state instead. RxDB then calls the conflict handler on the client, writes the result locally and pushes it again. The conflict check and the write run synchronously in one tick of the Node.js event loop, so no other request can change the document in between. With a real database you have to run them inside of a transaction.

### Pull stream with Server-Sent Events

```
GET /api/todos/pullStream
data: { "documents": [...], "checkpoint": { "seq": 62 } }
```

After each successful push, the server sends the written documents with their checkpoint to all connected clients. The client feeds these events into `pull.stream$`. When the connection drops, the `EventSource` reconnects on its own and the client emits `'RESYNC'`. RxDB then pulls everything that changed since the last checkpoint, so no change gets lost while the client was disconnected.

### Conflict handler

The handler compares each field (`title`, `done`) of the local state and of the server state with the `assumedMasterState`:

- A field that changed only on one side keeps that change.
- A field that changed on both sides takes the value with the newer `updatedAt`.
- A deletion on either side wins over an edit.

## Things this example does not cover

- **Authentication**: Add a session cookie or token check to all three endpoints. The browser `EventSource` cannot send custom headers, so use cookies or a query parameter for the SSE endpoint.
- **End-to-end encryption**: The encryption plugin encrypts data at rest on the client. The replication sends the decrypted documents to the server. If the server must not see the data, encrypt the fields yourself before pushing.
- **Persistence**: The server keeps the documents in memory and writes them to `server/data.json`. Use a real database for production.
- **Scaling**: The SSE clients are tracked in memory. With more than one server process you need a shared message bus (for example Redis Pub/Sub) to forward the events.

More about replication: [rxdb.info/replication.html](https://rxdb.info/replication.html)
