---
title: Google Drive Sync
slug: replication-google-drive.html
description: Sync your RxDB application state with Google Drive.
image: /headers/replication-google-drive.jpg
---

import {Steps} from '@site/src/components/steps';

# Replication with Google Drive (beta)

The `replication-google-drive` plugin allows you to replicate your client-side [RxDB](./) database to a folder in the user's Google Drive. This enables cross-device [sync](./replication.md) for single users without requiring any backend server.



<br />
<p align="center">
  <img src="./files/icons/google-drive.svg" alt="Google Drive Sync" 
  height="60" />
</p>



## Overview

The replication uses the Google Drive API v3 and v2.

- **[Offline-First](./offline-first.md):** Users can work offline. Changes are synced when they go online.
- **No Backend Required:** You don't need to host your own database server.
- **Cross-Device:** Users can access their data from multiple devices by signing into the same Google account.
- **Realtime Sync:** Uses [WebRTC](./replication-webrtc.md) for peer-to-peer signaling to achieve near real-time updates. Uses the same google-drive folder instead of a signaling-server.


:::info
This plugin is in **beta** since RxDB version 17.0.0.
:::


## Usage

<Steps>

### Enable Google Drive API

You need to enable the Google Drive API in the [Google Cloud Console](https://console.cloud.google.com/) and create credentials (OAuth 2.0 Client ID) for your application.

### Authenticate the User

Your application must handle the OAuth flow to get an `accessToken` from Google. You can use libraries like [`@react-oauth/google`](https://www.npmjs.com/package/@react-oauth/google) or the Google Identity Services SDK.

### Start Replication

Once you have the `accessToken`, you can start the replication.

```ts
import { replicateGoogleDrive } from 'rxdb/plugins/replication-google-drive';

const replicationState = await replicateGoogleDrive({
    replicationIdentifier: 'my-app-drive-sync',
    collection: myRxCollection, // [RxCollection](./rx-collection.md)
    googleDrive: {
        oauthClientId: 'YOUR_GOOGLE_CLIENT_ID',
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

Google Drive does not provide real-time events for file changes. If a user changes data on **User Device A**, **User Device B** would not know about it until it periodically polls the Drive API.
To achieve real-time updates, this plugin uses **WebRTC** to signal changes between connected devices.

1.  Devices create "signal files" in a `signaling` subfolder on Google Drive.
2.  Other devices detect these files, read the WebRTC connection data, and establish a direct P2P connection with each other.
3.  When a device makes a write, it sends a "RESYNC" signal via WebRTC to all connected peers to notify them about the change.

### Polyfill for Node.js

WebRTC is native in browsers but requires a polyfill in Node.js.

```ts
import wrtc from 'node-datachannel/polyfill'; // or 'wrtc' package
// ...
const replicationState = await replicateGoogleDrive({
    // ...
    signalingOptions: {
        wrtc // Pass the polyfill here
    }
});
```

## Options

### googleDrive

- **oauthClientId** `string`: The OAuth 2.0 Client ID of your application.
- **authToken** `string`: The valid access token associated with the user.
- **folderPath** `string`: The path to the folder in Google Drive where data should be stored.
    - The plugin will ensure this folder exists.
    - It must **not** be the root folder.
    - It creates subfolders `docs` (for data) and `signaling` (for WebRTC).
- **apiEndpoint** `string` (optional): Defaults to `https://www.googleapis.com`. Useful for mocking or proxies.
- **transactionTimeout** `number` (optional): Default `10000` (10s). The plugin uses a `transaction` file in Drive to ensure data integrity during writes. This is the timeout after which a lock is considered stale.

### pull & push

Standard RxDB [Replication Options](./replication.md) for batch size, modifiers, etc.

## Technical Details

### File Mapping
- Each RxDB document corresponds to **one JSON file** in the `docs` subfolder.
- The filename is `[primaryKey].json`.
- This simple mapping makes it easy to inspect or backup data manually.

### Checkpointing
- The replication relies on the `modifiedTime` of files in Google Drive.

### Conflict Resolution
- Conflicts are handled using the standard RxDB [conflict handling](./replication.md#conflict-handling) strategies.
- The plugin assumes a master-slave replication pattern where the client (RxDB) merges changes.
- If the `transaction` file is locked by another device, the write retries until the lock is released or times out.

## Limitations

- **Rate Limits:** Google Drive API has strict rate limits. The plugin attempts to handle 429 errors with exponential backoff, but heavy concurrent writes might hit these limits.
- **Latency:** Changes take time to propagate and appear in listings (eventual consistency), which the plugin handles internally.
- **Signaling Delay:** The initial WebRTC handshake requires writing and reading files from Drive, which can take a few seconds. Once connected, signaling is instant.

## Testing

For testing, it is recommended to use [google-drive-mock](https://github.com/pubkey/google-drive-mock). It simulates the Google Drive API so you can run tests without real credentials.