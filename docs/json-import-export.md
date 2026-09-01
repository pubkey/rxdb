# JSON Import and Export

> Export an RxDB database or collection into a plain JSON dump and import it back with the json-dump plugin, including attachments as base64.

import {Faq, FaqItem} from '@site/src/components/faq';

# 📤 JSON Import and Export

With the `json-dump` plugin you can export the data of a [RxDatabase](./rx-database.md) or a single [RxCollection](./rx-collection.md) into a plain JSON object and import that object back later.

The dump is a normal JavaScript object, so you can store it in a file, send it to a server, or keep it in [localStorage](./rx-storage-localstorage.md). It contains the documents in their decrypted form and, when you ask for it, the [attachments](./rx-attachment.md) data as base64 strings.

This is useful to:

- **Seed a database** with a fixed set of documents in tests or demos.
- **Move data between two databases**, for example when a user switches devices and you have no [replication](./replication.md) backend.
- **Let users download their own data** and load it back into the app.

The plugin runs in every runtime that RxDB supports. For server side backups that stream to disk instead of building one big object in memory, use the [backup plugin](./backup.md).

## Installation

```ts
import { addRxPlugin } from 'rxdb';
import { RxDBJsonDumpPlugin } from 'rxdb/plugins/json-dump';
addRxPlugin(RxDBJsonDumpPlugin);
```

## Export a collection

`exportJSON()` creates a dump of every document in the collection.

```ts
const json = await myCollection.exportJSON();
console.dir(json);
/* > {
 *     name: 'heroes',
 *     schemaHash: '22b549e064b35a21494eadc441491eeb644bee28aadb0feb9303cb37c0d51b86',
 *     docs: [
 *         {
 *             id: 'alice',
 *             name: 'Alice',
 *             color: 'blue',
 *             _deleted: false,
 *             _meta: { lwt: 1787225698353.01 }
 *         }
 *     ]
 * }
 */
```

The `schemaHash` is written into the dump so that `importJSON()` can refuse a dump that was created from a different schema. The revision `_rev` is not part of the dump, because the importing database creates its own revisions.

## Import into a collection

`importJSON()` writes the documents of a dump into the collection.

```ts
await myCollection.importJSON(json);
```

The collection has to exist and its schema has to be the same one the dump was created from. When the hashes do not match, RxDB throws the error `JD2`.

Notice that importing fires a change event for each inserted document, so open [queries](./rx-query.md) and their subscriptions update on their own.

## Export a database

On the database level, `exportJSON()` runs the export for every collection and puts the results into one object.

```ts
const json = await myDatabase.exportJSON();
console.dir(json);
/* > {
 *     name: 'heroesdb',
 *     instanceToken: 'ruxpmzxulz',
 *     collections: [
 *         {
 *             name: 'heroes',
 *             schemaHash: '22b549e064b35a...',
 *             docs: []
 *         }
 *     ]
 * }
 */
```

To export only some of the collections, pass their names as the first argument.

```ts
const json = await myDatabase.exportJSON(['heroes', 'villains']);
```

Collections whose name starts with an underscore are internal and are always left out of the database export.

## Import into a database

```ts
await myDatabase.importJSON(json);
```

The collections must be created before the import, because the dump does not carry the collection settings like the [schema](./rx-schema.md), the [migration strategies](./migration-schema.md) or the conflict handler. When the dump contains a collection that does not exist in the database, RxDB throws the error `JD1` and nothing is written.

## Attachments

By default the [attachments](./rx-attachment.md) of the documents are not part of the dump, because their binary data can be way bigger than the documents itself. Set the `attachments` option to `true` to include them. The data is then stored as a base64 string so that the dump stays JSON friendly.

```ts
const json = await myCollection.exportJSON({ attachments: true });
console.dir(json.docs[0]._attachments);
/* > {
 *     'cat.txt': {
 *         type: 'text/plain',
 *         length: 4,
 *         data: 'bWVvdw=='
 *     }
 * }
 */
```

On the database level you can pass the options either as the first argument or after the list of collection names.

```ts
// export everything, including the attachments
const json = await myDatabase.exportJSON({ attachments: true });

// export only some collections, including the attachments
const partialJson = await myDatabase.exportJSON(['heroes'], { attachments: true });
```

`importJSON()` turns the base64 strings back into `Blob`s and writes them together with the documents, so no extra option is needed on the import side. The attachment digest is calculated again with the hash function of the importing database, which means a dump can be imported into a database that uses a different `hashFunction`.

Base64 needs about **33%** more space than the raw bytes. When your documents carry big images or videos, the dump grows accordingly and you might want to keep `attachments: false` and move the files with something else.

## Limitations

Keep these in mind before you use a dump as your backup strategy:

- **Encrypted fields are exported in plain text.** The export reads the documents through the collection, so the [encryption](./encryption.md) is already undone at that point. Treat the dump as sensitive data and never write it to a place where the plain values must not appear.
- **Deleted documents are not part of the dump.** The export runs a normal query, and queries skip deleted documents. Because of that, a dump cannot be used to replicate deletions to another database.
- **Revisions are not part of the dump.** On import, every document is written as a fresh insert with a new revision and a new `_meta.lwt`. A dump is a snapshot of the current state, not a history.
- **The whole dump is built in memory.** For a few thousand documents this is fine. For a large dataset, use the [backup plugin](./backup.md) or one of the [replication](./replication.md) plugins instead.
- **The schema hash must match.** A dump cannot be imported into a collection with a changed schema. To move data across a schema change, import it into a collection with the old schema version and let the [schema migration](./migration-schema.md) run.

## FAQ

<Faq>
<FaqItem question="How do I export an RxDB database to a JSON file?">

Call `exportJSON()` on the [RxDatabase](./rx-database.md) and write the result with `JSON.stringify()`. The dump is a plain object without class instances, so it survives the round trip through a string. In Node.js you can write it with `fs.writeFileSync()`, in the browser you can offer it to the user as a download.

</FaqItem>
<FaqItem question="Does exportJSON() include attachments?">

Only when you ask for it. The `attachments` option defaults to `false` so that dumps stay small. Call `exportJSON({ attachments: true })` to get the [attachments](./rx-attachment.md) data as base64 strings, which `importJSON()` writes back together with the documents.

</FaqItem>
<FaqItem question="Why does importJSON() throw that the schema is different?">

The dump stores the hash of the [schema](./rx-schema.md) it was created from, and the import compares it with the hash of the target collection. Any change to the schema changes the hash, even one that looks harmless like a new optional field. Create the target collection with the exact schema the dump came from, then run a [schema migration](./migration-schema.md) to reach the new version.

</FaqItem>
<FaqItem question="Should I use the json-dump plugin or the backup plugin?">

Use the json-dump plugin when you need one JSON object that you can move around, for example to seed a database or to hand a user their data. Use the [backup plugin](./backup.md) when you run on the server and want the state written to disk continuously. The backup plugin writes each document as its own file and continues from the last checkpoint, so it also works for datasets that do not fit into memory.

</FaqItem>
<FaqItem question="Can I use a JSON dump to sync two devices?">

No. A dump has no revisions and no deletions, so importing it a second time overwrites the target state instead of merging it. For two databases that both accept writes, use the [RxDB replication](./replication.md), which handles conflicts, deletions, and checkpoints.

</FaqItem>
</Faq>

## Follow Up

- Learn how to [back up a database to the filesystem](./backup.md) on the server side.
- Learn how to [replicate](./replication.md) your data with a backend instead of moving dumps around.
- Read the [attachments](./rx-attachment.md) docs to learn how binary data is stored.
- Start with the [RxDB Quickstart](./quickstart.md).
