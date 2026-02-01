---
title: Google Drive Sync
slug: replication-google-drive.html
description: Sync your RxDB application state with Google Drive.
---

import {Steps} from '@site/src/components/steps';

# Replication with Google Drive

The `replication-google-drive` plugin allows you to replicate your client-side [RxDB](./) database to a folder in the user's Google Drive. This enables cross-device sync for single users without requiring a custom backend server.

## Overview

The replication uses the Google Drive API v3. Each RxDB document is stored as a separate JSON file in a specific folder in the user's Google Drive.

- **Offline-First:** Users can work offline. Changes are synced when they go online.
- **No Backend Required:** You don't need to host your own database server.
- **Cross-Device:** Users can access their data from multiple devices by signing into the same Google account.

## Usage

<Steps>

### Enable Google Drive API

You need to enable the Google Drive API in the [Google Cloud Console](https://console.cloud.google.com/) and create credentials (OAuth 2.0 Client ID) for your application.

### Authenticate the User

Your application must handle the OAuth flow to get an `accessToken` from Google. You can use libraries like `react-oauth/google` or the Google Identity Services SDK.

### Start Replication

Once you have the `accessToken`, you can start the replication.

```ts
import { replicateGoogleDrive } from 'rxdb/plugins/replication-google-drive';

const replicationState = replicateGoogleDrive({
    replicationIdentifier: 'my-app-drive-sync',
    collection: myRxCollection,
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

## Options

### googleDrive

- **oauthClientId** `string`: The OAuth 2.0 Client ID of your application.
- **authToken** `string`: The valid access token associated with the user.
- **folderPath** `string`: The path to the folder in Google Drive where data should be stored. The plugin will ensure this folder exists.
- **apiEndpoint** `string` (optional): Defaults to `https://www.googleapis.com`.

### pull & push

Standard RxDB [Replication Options](./replication.md) for batch size, modifiers, etc.

## Conflict Resolution

Conflicts are handled using the standard RxDB [conflict handling](./replication.md#conflict-handling) strategies. Since Google Drive files have a `modifiedTime`, RxDB uses this to determine the latest state, but assumes a master-slave replication pattern where the client (RxDB) merges changes.

Note: The Google Drive replication is designed for single-user scenarios (syncing one user's data across devices). Collaborative editing of the same document by multiple users simultaneously may result in conflicts that need careful handling.

## Limitations

- **Rate Limits:** Google Drive API has rate limits. The plugin attempts to handle 429 errors with retries, but heavy write loads might hit these limits.
- **Latency:** Changes take time to propagate and appear in listings (eventual consistency), which the plugin handles internally.

