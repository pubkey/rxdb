# Attachments

Attachments are binary data files that can be attachment to an `RxDocument`, like a file that is attached to an email.

Using attachments instead of adding the data to the normal document, ensures that you still have a good **performance** when querying and writing documents, even when a big amount of data, like an image file has to be stored.

- You can store string, binary files, images and whatever you want side by side with your documents.
- Deleted documents automatically loose all their attachments data.
- Not all replication plugins support the replication of attachments.
- Attachments can be stored encrypted.

Internally, attachments in RxDB are stored and handled similar to how [CouchDB, PouchDB](https://pouchdb.com/guides/attachments.html#how-attachments-are-stored) does it.


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
        encrypted: true // if true, the attachment-data will be encrypted with the db-password
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
const attachment = await myDocument.putAttachment(
    {
        id,     // (string) name of the attachment like 'cat.jpg'
        data,   // (string|Blob) data of the attachment
        type    // (string) type of the attachment-data like 'image/jpeg'
    }
);
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

Gets an Observable which emits a stream of all attachments from the document. Re-emits each time an attachment gets added or removed from the RxDocument.

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

NOTICE: The digest is NOT calculated by RxDB, instead it is calculated by the RxStorage. The only guarantee is that the digest will change when the attachments data changes.

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
const blob = await attachment.getData();
```

## getStringData()

Returns a Promise which resolves the attachment's data as `string`.

```javascript
const attachment = await myDocument.getAttachment('cat.jpg');
const data = await attachment.getStringData();
```
