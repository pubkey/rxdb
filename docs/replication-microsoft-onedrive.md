# Microsoft OneDrive Sync

> Sync your RxDB application state with Microsoft OneDrive.

import {Steps} from '@site/src/components/steps';
import {BetaBlock} from '@site/src/components/beta-block';
import {HeadlineWithIcon} from '@site/src/components/headline-with-icon';

# <HeadlineWithIcon h1 icon={}>Replication with Microsoft OneDrive</HeadlineWithIcon>

The `replication-microsoft-onedrive` plugin allows you to replicate your client-side [RxDB](./) database to a folder in the user's Microsoft OneDrive. This enables cross-device [sync](./replication.md) for single users without requiring any backend server.

## Overview

The replication uses the Microsoft Graph API.

- **[Offline-First](./offline-first.md):** Users can work offline. Changes are synced when they go online.
- **No Backend Required:** You don't need to host your own database server.
- **Cross-Device:** Users can access their data from multiple devices by signing into the same Microsoft account.
- **Realtime Sync:** Uses [WebRTC](./replication-webrtc.md) for peer-to-peer signaling to achieve near real-time updates. Uses the same onedrive folder instead of a signaling-server.

<BetaBlock since="17.0.0" />

## Usage

<Steps>

### Enable Microsoft Graph API

You need to register your application in the [Azure portal](https://portal.azure.com/) and create credentials (OAuth 2.0 Client ID) with `Files.ReadWrite` permissions for your application.

### Authenticate the User

Your application must handle the OAuth flow to get an `accessToken` from Microsoft. You can use libraries like `@azure/msal-browser` or `@azure/msal-react`.

### Start Replication

Once you have the `accessToken`, you can start the replication.

```ts
import {
    replicateMicrosoftOneDrive
} from 'rxdb/plugins/replication-microsoft-onedrive';

const replicationState = await replicateMicrosoftOneDrive({
    replicationIdentifier: 'my-app-onedrive-sync',
    collection: myRxCollection, // RxCollection
    oneDrive: {
        authToken: 'USER_ACCESS_TOKEN',
        folderPath: 'my-app-data/user-1'
    },
    live: true,
    pull: {
        batchSize: 60,
        modifier: doc => doc // (optional) modify invalid data
    },
    push: {
        batchSize: 60,
        modifier: doc => doc // (optional) modify before sending
    }
});

// Observe replication states
replicationState.error$.subscribe(err => {
    console.error('Replication error:', err);
});

replicationState.awaitInitialReplication().then(() => {
    console.log('Initial replication done');
});
```

</Steps>

## Signaling & WebRTC

Microsoft OneDrive does not provide real-time events for file changes that a client can easily subscribe to in the browser. If a user changes data on **User Device A**, **User Device B** would not know about it until it periodically polls the API.
To achieve real-time updates, this plugin uses **WebRTC** to signal changes between connected devices.

1.  Devices create "signal files" in a `signaling` subfolder on OneDrive.
2.  Other devices detect these files, read the WebRTC connection data, and establish a direct P2P connection with each other.
3.  When a device makes a write, it sends a "RESYNC" signal via WebRTC to all connected peers to notify them about the change.

### Polyfill for Node.js

WebRTC is native in browsers but requires a polyfill in Node.js. Use `createSimplePeerWrtc()` to wrap the polyfill for compatibility with `simple-peer`:

```ts
import nodeDatachannelPolyfill from 'node-datachannel/polyfill';
import { createSimplePeerWrtc } from 'rxdb/plugins/replication-webrtc';
// ...
const replicationState = await replicateMicrosoftOneDrive({
    // ...
    signalingOptions: {
        wrtc: createSimplePeerWrtc(nodeDatachannelPolyfill)
    }
});
```

## Options

### oneDrive

- **authToken** `string`: The valid access token associated with the user.
- **folderPath** `string`: The path to the folder in Microsoft OneDrive where data should be stored.
    - The plugin will ensure this folder exists.
    - It must **not** be the root folder.
    - It creates subfolders `docs` (for data) and `signaling` (for WebRTC).
- **apiEndpoint** `string` (optional): Defaults to `https://graph.microsoft.com/v1.0/me/drive`. Useful for mocking or proxies.
- **transactionTimeout** `number` (optional): Default `10000` (10s). The plugin uses a `transaction.json` file in OneDrive to ensure data integrity during writes. This is the timeout after which a lock is considered stale.

### pull & push

Standard RxDB [Replication Options](./replication.md) for batch size, modifiers, etc.

## Technical Details

### File Mapping
- Each RxDB document corresponds to **one JSON file** in the `docs` subfolder.
- The filename is `[primaryKey].json`.
- This simple mapping makes it easy to inspect or backup data manually.

### Checkpointing
- The replication relies on the `lastModifiedDateTime` of files in Microsoft OneDrive.

### Conflict Resolution
- Conflicts are handled using the standard RxDB [conflict handling](./replication.md#conflict-handling) strategies.
- The plugin assumes a master-slave replication pattern where the client (RxDB) merges changes.
- If the `transaction.json` file is locked by another device, the write retries until the lock is released or times out.

## Limitations

- **Rate Limits:** Microsoft Graph API has strict rate limits. The plugin attempts to handle 429 errors with exponential backoff, but heavy concurrent writes might hit these limits.
- **Latency:** Changes take time to propagate and appear in listings (eventual consistency), which the plugin handles internally.
- **Signaling Delay:** The initial WebRTC handshake requires writing and reading files from OneDrive, which can take a few seconds. Once connected, signaling is instant.

## Testing

For testing, it is recommended to use [microsoft-onedrive-mock](https://github.com/pubkey/microsoft-onedrive-mock). It simulates the Microsoft Graph API so you can run tests without real credentials.
