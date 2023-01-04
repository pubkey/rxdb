# Remote RxStorage (beta)

The Remote [RxStorage](./rx-storage.md) is made to use a remote storage and communicate with it over an asynchronous message channel.
The remote part could be on another JavaScript process or even on a different host machine.
The remote storage plugin is used in many RxDB plugins like the [worker](./rx-storage-worker.md) or the [electron](./electron.md) plugin.



## Usage

The remote storage communicates over a message channel which has to implement the `messages$` observable and a `send()` function on both sides.


```ts
// on the client
import { RxStorageDexieStatics } from 'rxdb/plugins/storage-dexie';
import { getRxStorageRemote } from 'rxdb/plugins/storage-remote';
const storage = getRxStorageRemote({
    identifier: 'my-id',
    statics: RxStorageDexieStatics,
    messages$: new Subject(),
    send(msg) {
        // send to remote storage
    }
});
const myDb = await createRxDatabase({
    storage
});



// on the remote
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { exposeRxStorageRemote } from 'rxdb/plugins/storage-remote';
exposeRxStorageRemote({
    storage: getRxStorageDexie(),
    messages$: new Subject(),
    send(msg){
        // send to other side
    }
});
```




## Usage with a Websocket server

The remote storage plugin contains helper functions to create a remote storage over a WebSocket server.


```ts
// Create a remote storage Websocket server in Node.js
import { getRxStorageMemory } from 'rxdb/plugins/storage-memory';
import { startRxStorageRemoteWebsocketServer } from 'rxdb/plugins/storage-remote-websocket';
const server = await startRxStorageRemoteWebsocketServer({
    port: 8080,
    storage: getRxStorageMemory()
});


// Connect to the remote storage on the client
import { getRxStorageRemoteWebsocket } from 'rxdb/plugins/storage-remote-websocket';
const myDb = await createRxDatabase({
    storage: getRxStorageRemoteWebsocket({
        statics,
        url: 'ws://example.com:8080'
    })
});
```
