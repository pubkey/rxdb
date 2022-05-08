# Quickstart




- Install the RxDB library and RxJS (if not installed before)

`npm install rxdb rxjs --save`

- Create a database with the PouchDB [RxStorage](./rx-storage.md) (You can also use other storages based on [LokiJS](./rx-storage-lokijs.md) or [Dexie.js](./rx-storage-dexie.md)).

```ts
import { createRxDatabase } from 'rxdb';

import { getRxStoragePouch, addPouchPlugin } from 'rxdb/plugins/pouchdb';
addPouchPlugin(require('pouchdb-adapter-idb'));

const db = await createRxDatabase({
  name: 'heroesdb',
  storage: getRxStoragePouch('idb')
});
```

- Create a schema for a collection

```ts
const mySchema = {
    title: 'human schema',
    version: 0,
    primaryKey: 'passportId',
    type: 'object',
    properties: {
        passportId: {
            type: 'string',
            maxLength: 100 // <- the primary key must have set maxLength
        },
        firstName: {
            type: 'string'
        },
        lastName: {
            type: 'string'
        },
        age: {
            description: 'age in years',
            type: 'integer',

            // number fields that are used in an index, must have set minium, maximum and multipleOf
            minimum: 0,
            maximum: 150,
            multipleOf: '1'
        }
    },
    required: ['firstName', 'lastName', 'passportId'],
    indexes: ['age']
}
```

- Add a collection to the database

```ts
const myCollections = await myDatabase.addCollections({
  humans: {
    schema: mySchema
  },
});
```


- Insert a document

```ts
const myDocument = await myDatabase.humans.insert({
    passportId: 'foobar',
    firstName: 'Alice',
    lastName: 'Bobby',
    age: 42
});
```

- Subscribe to a document value

```ts

myDocument.lastName$.subscribe(lastName => {
    console.log('lastName is now ' + lastName);
});

```


- Query some documents

```ts
const foundDocuments = await myDatabase.humans.find({
    selector: {
        age: {
            $gt: 21
        }
    }
}).exec();
```

- Subscribe to query results

```ts
myDatabase.humans.find({
    selector: {
        age: {
            $gt: 21
        }
    }
}).$.subscribe(documents => {
    console.log('query has found ' + documents.length + ' documents');
});
```


- Update the document

```ts
// either via atomicUpdate()
await myDocument.atomicUpdate(data => {
    data.lastName = 'Carol';
    return data;
});

// or via atomicPatch()
await myDocument.atomicPatch({
    lastName: 'Carol'
});
```

- Remove the document

```ts
await myDocument.remove();
```



---------
To read the full documentation, continue [here](./install.md)
