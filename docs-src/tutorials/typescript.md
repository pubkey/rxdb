# Using RxDB with TypeScript

<!-- IMPORTANT: When you edit this file, apply the same changes to test/tutorials/src/typescript.ts -->

In this tutorial you learn how to use RxDB with TypeScript.
We will create a basic database with one collection and several ORM-methods, fully typed!

RxDB directly comes with it's typings and you do not have to install anything else, however the latest version of RxDB (v9+) requires that you are using Typescript v3.8 or higher.
Our way to go is

- First define how the documents look like
- Then define how the collections look like
- Then define how the database looks like

## Declare the types

First you import the types from RxDB.

```typescript
import {
    createRxDatabase,
    RxDatabase,
    RxCollection,
    RxJsonSchema,
    RxDocument,
} from 'rxdb';
```

Then you can declare the base-type for your document. The base-type is basically the typescript-representation of the jsonschema of the collection. If you have many collections, you could also generate the base-type with [json-schema-to-typescript](https://www.npmjs.com/package/json-schema-to-typescript)


```typescript
type HeroDocType = {
    passportId: string;
    firstName: string;
    lastName: string;
    age?: number; // optional
};
```

We also add some ORM-methods for the document.

```typescript
type HeroDocMethods = {
    scream: (v: string) => string;
};
```

We can merge these into our HeroDocument.

```typescript
type HeroDocument = RxDocument<HeroDocType, HeroDocMethods>;
```

Now we can define type for the collection which contains the documents.

```typescript

// we declare one static ORM-method for the collection
type HeroCollectionMethods = {
    countAllDocuments: () => Promise<number>;
}

// and then merge all our types
type HeroCollection = RxCollection<HeroDocType, HeroDocMethods, HeroCollectionMethods>;
```


Before we can define the database, we make a helper-type which contains all collections of it.

```typescript
type MyDatabaseCollections = {
    heroes: HeroCollection
}
```

Now the database.

```typescript
type MyDatabase = RxDatabase<MyDatabaseCollections>;
```

## Using the types

Now that we have declare all our types, we can use them.


```typescript

/**
 * create database and collections
 */
const myDatabase: MyDatabase = await createRxDatabase<MyDatabaseCollections>({
    name: 'mydb',
    adapter: 'memory'
});

const heroSchema: RxJsonSchema<HeroDocType> = {
    title: 'human schema',
    description: 'describes a human being',
    version: 0,
    keyCompression: true,
    type: 'object',
    properties: {
        passportId: {
            type: 'string',
            primary: true
        },
        firstName: {
            type: 'string'
        },
        lastName: {
            type: 'string'
        },
        age: {
            type: 'integer'
        }
    },
    required: ['firstName', 'lastName']
};

const heroDocMethods: HeroDocMethods = {
    scream: function(this: HeroDocument, what: string) {
        return this.firstName + ' screams: ' + what.toUpperCase();
    }
};

const heroCollectionMethods: HeroCollectionMethods = {
    countAllDocuments: async function(this: HeroCollection) {
        const allDocs = await this.find().exec();
        return allDocs.length;
    }
};

await myDatabase.addCollections({
    heroes: {
        schema: heroSchema,
        methods: heroDocMethods,
        statics: heroCollectionMethods
    }
});

// add a postInsert-hook
myDatabase.heroes.postInsert(
    function myPostInsertHook(
        this: HeroCollection, // own collection is bound to the scope
        docData: HeroDocType, // documents data
        doc: HeroDocument // RxDocument
    ) {
        console.log('insert to ' + this.name + '-collection: ' + doc.firstName);
    },
    false // not async
);

/**
 * use the database
 */

// insert a document
const hero: HeroDocument = await myDatabase.heroes.insert({
    passportId: 'myId',
    firstName: 'piotr',
    lastName: 'potter',
    age: 5
});

// access a property
console.log(hero.firstName);

// use a orm method
hero.scream('AAH!');

// use a static orm method from the collection
const amount: number = await myDatabase.heroes.countAllDocuments();
console.log(amount);


/**
 * clean up
 */
myDatabase.destroy();
```


--------------------------------------------------------------------------------

If you are new to RxDB, you should continue [here](./server.md)
