# Attachments

Like [pouchdb](https://pouchdb.com/guides/attachments.html), RxDB can store attachments which have better performance and a higher [quota-limit](https://www.html5rocks.com/en/tutorials/offline/quota-research/) than regular data.

You can store string, binary files, images and whatever you want side by side with your documents.

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
        data,   // (string|Blob|Buffer) data of the attachment
        type    // (string) type of the attachment-data like 'image/jpeg'
    },
    true // (boolean, optional) skipIfSame:If true and attachment already exists with same data, the write will be skipped
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

The md5-sum of the attachments data as `string`.

### rev

The revision-number of the attachment as `number`.

### remove()

Removes the attachment. Returns a Promise that resolves when done.

```javascript
const attachment = myDocument.getAttachment('cat.jpg');
await attachment.remove();
```

## getData()

Returns a Promise which resolves the attachment's data as `Blob` or `Buffer`. (async)

```javascript
const attachment = myDocument.getAttachment('cat.jpg');
const blobBuffer = await attachment.getData();
```

## getStringData()

Returns a Promise which resolves the attachment's data as `string`.

```javascript
const attachment = await myDocument.getAttachment('cat.jpg');
const data = await attachment.getStringData();
```

---------
If you are new to RxDB, you should continue [here](./middleware.md)
