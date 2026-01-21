# Remote RxStorage

> The Remote [RxStorage](./rx-storage.md) is made to use a remote storage and communicate with it over an asynchronous message channel.
The remote part could be on another JavaScript process or even on a different host machine.
The remote storage plugin is used in many RxDB plugins like the [worker](./rx-storage-worker.md) or the [electron](./electron.md) plugin.

# Remote RxStorage

The Remote [RxStorage](./rx-storage.md) is made to use a remote storage and communicate with it over an asynchronous message channel.
The remote part could be on another JavaScript process or even on a different host machine.
The remote storage plugin is used in many RxDB plugins like the [worker](./rx-storage-worker.md) or the [electron](./electron.md) plugin.

## Usage

The remote storage communicates over a message channel which has to implement the `messageChannelCreator` function which returns an object that has a `messages$` observable and a `send()` function on both sides and a `close()` function that closes the RemoteMessageChannel.

```ts
// on the client
import { getRxStorageRemote } from 'rxdb/plugins/storage-remote';
const storage = getRxStorageRemote({
    identifier: 'my-id',
    mode: 'storage',
    messageChannelCreator: () => Promise.resolve({
        messages$: new Subject(),
        send(msg) {
            // send to remote storage
        }
    })
});
const myDb = await createRxDatabase({
    storage
});

// on the remote
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';
import { exposeRxStorageRemote } from 'rxdb/plugins/storage-remote';
exposeRxStorageRemote({
    storage: getRxStorageLocalstorage(),
    messages$: new Subject(),
    send(msg){
        // send to other side
    }
});
```

## Usage with a Websocket server

The remote storage plugin contains helper functions to create a remote storage over a WebSocket server.
This is often used in Node.js to give one microservice access to another services database **without** having to replicate the full database state.

```ts
// server.js
import { getRxStorageMemory } from 'rxdb/plugins/storage-memory';
import { startRxStorageRemoteWebsocketServer } from 'rxdb/plugins/storage-remote-websocket';

// either you can create the server based on a RxDatabase
const serverBasedOnDatabase = await startRxStorageRemoteWebsocketServer({
    port: 8080,
    database: myRxDatabase
});

// or you can create the server based on a pure RxStorage
const serverBasedOn = await startRxStorageRemoteWebsocketServer({
    port: 8080,
    storage: getRxStorageMemory()
});
```

```ts
// client.js

import { getRxStorageRemoteWebsocket } from 'rxdb/plugins/storage-remote-websocket';
const myDb = await createRxDatabase({
    storage: getRxStorageRemoteWebsocket({
        url: 'ws://example.com:8080'
    })
});
```

## Sending custom messages

The remote storage can also be used to send custom messages to and from the remote instance.

One the remote you have to define a `customRequestHandler` like:

```ts
const serverBasedOnDatabase = await startRxStorageRemoteWebsocketServer({
    port: 8080,
    database: myRxDatabase,
    async customRequestHandler(msg){
        // here you can return any JSON object as an 'answer'
        return {
            foo: 'bar'
        };
    } 
});
```

On the client instance you can then call the `customRequest()` method:

```ts
const storage = getRxStorageRemoteWebsocket({
    url: 'ws://example.com:8080'
});
const answer = await storage.customRequest({ bar: 'foo' });
console.dir(answer); // > { foo: 'bar' }
```
