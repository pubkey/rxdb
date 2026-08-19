---
title: Attachments
slug: rx-attachment.html
description: Learn how to store and manage binary data like images or files in RxDB using attachments. Discover features, performance benefits, encryption, compression, and usage examples with code.
image: /headers/rx-attachment.jpg
---

import { DefaultCompressibleTypes } from '@site/src/components/default-compressible-types';

# Attachments

Attachments are binary data files that can be attachment to an `RxDocument`, like a file that is attached to an email.

Using attachments instead of adding the data to the normal document, ensures that you still have a good **performance** when querying and writing documents, even when a big amount of data, like an image file has to be stored.

- You can store string, binary files, images and whatever you want side by side with your documents.
- Deleted documents automatically loose all their attachments data.
- Not all [replication](./replication.md) plugins support the replication of attachments.
- Attachments can be stored [encrypted](./encryption.md).

Internally, attachment data is stored as `Blob` objects. Blob is the canonical internal type because it is immutable, carries MIME type metadata via `Blob.type`, provides synchronous size via `Blob.size`, and is [structured-cloneable](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm) (works with Worker/Electron `postMessage` and IndexedDB). Conversion to `ArrayBuffer` only happens at system boundaries that require it: encryption (Web Crypto), compression (CompressionStream), digest hashing, and WebSocket serialization.


## Add the attachments plugin

To enable the attachments, you have to add the `attachments` plugin.

```ts
import { addRxPlugin } from 'rxdb';
import { RxDBAttachmentsPlugin } from 'rxdb/plugins/attachments';
addRxPlugin(RxDBAttachmentsPlugin);
```


## Enable attachments in the schema

Before you can use attachments, you have to ensure that the attachments-object is set in the schema of your `RxCollection`.

```javascript

const mySchema = {
    version: 0,
    type: 'object',
    properties: {
        // .
        // .
        // .
    },
    attachments: {
        // if true, the attachment-data will be
        // encrypted with the db-password
        encrypted: true
    }
};

const myCollection = await myDatabase.addCollections({
    humans: {
        schema: mySchema
    }
});
```

## putAttachment()

Adds an attachment to a `RxDocument`. Returns a Promise with the new attachment.

```javascript
import { createBlob } from 'rxdb';

const attachment = await myDocument.putAttachment(
    {
        id: 'cat.txt',     // (string) name of the attachment
        data: createBlob('meowmeow', 'text/plain'),   // (Blob) data of the attachment
        type: 'text/plain'   // (string) type of the attachment
                            // data like 'image/jpeg'
    }
);
```

:::warning
Expo/React-Native does not support the `Blob` API natively. Make sure you use your own polyfill that properly supports `blob.arrayBuffer()` when using RxAttachments or use the `putAttachmentBase64()` and `getDataBase64()` so that you do not have to create blobs.
:::

## putAttachments()

Write multiple attachments to a `RxDocument` in a single atomic operation. This is more efficient than calling `putAttachment()` multiple times because it only performs one write to the storage. Returns a Promise with an array of the new attachments.

```javascript
import { createBlob } from 'rxdb';

const attachments = await myDocument.putAttachments([
    {
        id: 'cat.txt',
        data: createBlob('meowmeow', 'text/plain'),
        type: 'text/plain'
    },
    {
        id: 'dog.txt',
        data: createBlob('woof', 'text/plain'),
        type: 'text/plain'
    }
]);
```

## putAttachmentBase64()

Same as `putAttachment()` but accepts a plain base64 string instead of a `Blob`.

```ts
const attachment = await doc.putAttachmentBase64({
    id: 'cat.txt',
    length: 4,
    data: 'bWVvdw==',
    type: 'text/plain'
});
```


## getAttachment()

Returns an `RxAttachment` by its id. Returns `null` when the attachment does not exist.

```javascript
const attachment = myDocument.getAttachment('cat.jpg');
```

## allAttachments()

Returns an array of all attachments of the `RxDocument`.

```javascript
const attachments = myDocument.allAttachments();
```

## allAttachments$

Gets an Observable which emits a stream of all attachments from the document. Re-emits each time an attachment gets added or removed from the [RxDocument](./rx-document.md).

```javascript
const all = [];
myDocument.allAttachments$.subscribe(
    attachments => all = attachments
);
```

## RxAttachment

The attachments of RxDB are represented by the type `RxAttachment` which has the following attributes/methods.

### doc

The `RxDocument` which the attachment is assigned to.

### id

The id as `string` of the attachment.

### type

The type as `string` of the attachment.

### length

The length of the data of the attachment as `number`.

### digest

The hash of the attachments data as `string`.

:::note
The digest is NOT calculated by RxDB, instead it is calculated by the RxStorage. The only guarantee is that the digest will change when the attachments data changes.
:::

### rev

The revision-number of the attachment as `number`.

### remove()

Removes the attachment. Returns a Promise that resolves when done.

```javascript
const attachment = myDocument.getAttachment('cat.jpg');
await attachment.remove();
```

## getData()

Returns a Promise which resolves the attachment's data as `Blob`. (async)

```javascript
const attachment = myDocument.getAttachment('cat.jpg');
const blob = await attachment.getData(); // Blob
```

## getDataBase64()

Returns a Promise which resolves the attachment's data as **base64** `string`.

```javascript
const attachment = myDocument.getAttachment('cat.jpg');
const base64Database = await attachment.getDataBase64(); // 'bWVvdw=='
```

## getStringData()

Returns a Promise which resolves the attachment's data as `string`.

```javascript
const attachment = await myDocument.getAttachment('cat.jpg');
const data = await attachment.getStringData(); // 'meow'
```


## Inline attachments on insert and upsert

Instead of inserting a document first and then calling `putAttachment()` separately, you can include attachments directly in the document data when using `insert()`, `bulkInsert()`, `upsert()`, `bulkUpsert()`, or `incrementalUpsert()`. Provide `_attachments` as an array of `{ id, type, data }` objects.

```javascript
import { createBlob } from 'rxdb';

// insert with inline attachments
const doc = await myCollection.insert({
    name: 'foo',
    _attachments: [
        {
            id: 'photo.jpg',
            type: 'image/jpeg',
            data: myJpegBlob
        },
        {
            id: 'notes.txt',
            type: 'text/plain',
            data: createBlob('some notes', 'text/plain')
        }
    ]
});

const attachment = doc.getAttachment('photo.jpg');
```

### Upsert behavior with attachments

When upserting a document that already exists, attachments from the new data are **merged** with the document's existing attachments by default. This means existing attachments not mentioned in the upsert data are preserved.

To replace all existing attachments instead, pass `{ deleteExistingAttachments: true }` as the second argument:

```javascript
// Merge (default): keeps existing attachments, adds/updates new ones
const doc = await myCollection.upsert(docData);

// Replace: only the attachments in docData will exist after the upsert
const doc2 = await myCollection.upsert(docData, { deleteExistingAttachments: true });
```

This option works with `upsert()`, `bulkUpsert()`, and `incrementalUpsert()`.




## Attachment compression {#attachment-compression}

Storing many attachments can be a problem when the disc space of the device is exceeded.
Therefore it can make sense to compress the attachments before storing them in the [RxStorage](./rx-storage.md).
With the `attachments-compression` plugin you can compress the attachments data on write and decompress it on reads.
This happens internally and will not change how you use the API. The compression is run with the [Compression Streams API](https://developer.mozilla.org/en-US/docs/Web/API/Compression_Streams_API) which is only supported on [newer browsers](https://caniuse.com/?search=compressionstream).

## MIME-type-aware compression

The compression plugin is MIME-type-aware. It only compresses attachment types that benefit from compression (text, JSON, SVG, etc.) and passes through already-compressed formats (JPEG, PNG, MP4, etc.) as-is. This avoids wasting CPU cycles on files that won't shrink.

A built-in default list of compressible types is used automatically. You can override it with the `compressibleTypes` option in your schema:

```ts
import {
    wrappedAttachmentsCompressionStorage
} from 'rxdb/plugins/attachments-compression';

import { getRxStorageIndexedDB } from 'rxdb-premium/plugins/storage-indexeddb';

// create a wrapped storage with attachment-compression.
const storageWithAttachmentsCompression = wrappedAttachmentsCompressionStorage({
    storage: getRxStorageIndexedDB()
});

const db = await createRxDatabase({
    name: 'mydatabase',
    storage: storageWithAttachmentsCompression
});


// set the compression mode at the schema level
const mySchema = {
    version: 0,
    type: 'object',
    properties: {
        // ..
    },
    attachments: {
        // Specify the compression mode.
        // OneOf ['deflate', 'gzip']
        compression: 'deflate',

        // Optional: override which MIME types get compressed.
        // Supports wildcard prefix matching
        // (e.g. 'text/*' matches 'text/plain',
        // 'text/html', etc.).
        // If omitted, a built-in default list of compressible types is used.
        compressibleTypes: [
            'text/*',
            'application/json',
            'application/xml',
            'image/svg+xml'
            // ... add your own patterns
        ]
    }
};

/* ... create your collections as usual and store attachments in them. */

```

The default compressible types include the following MIME type patterns. Binary formats like `image/jpeg`, `image/png`, `video/*`, and `audio/*` are **not** in the default list and will be stored without re-compression.

<DefaultCompressibleTypes />
