---
title: TypeScript Setup
slug: typescript.html
description: Use RxDB with TypeScript to define typed schemas, create typed collections, and build fully typed ORM methods. A quick step-by-step guide.
---

import {Steps} from '@site/src/components/steps';

# Using RxDB with TypeScript

<!-- IMPORTANT: When you edit this file, apply the same changes to test/tutorials/src/typescript.ts -->

In this tutorial you will learn how to use RxDB with TypeScript.
We will create a basic database with one collection and several ORM-methods, fully typed!

RxDB directly comes with its typings and you do not have to install anything else, however the latest version of RxDB requires that you are using Typescript v3.8 or newer.
Our way to go is

- First define what the documents look like
- Then define what the collections look like
- Then define what the database looks like

<Steps>

## Declare the types

First you import the types from RxDB.

```typescript
import {
    createRxDatabase,
    RxDatabase,
    RxCollection,
    RxJsonSchema,
    RxDocument,
} from 'rxdb/plugins/core';
```


## Create the base document type

First we have to define the TypeScript type of the documents of a collection:

**Option A**: Create the document type from the schema

```typescript
import {
    toTypedRxJsonSchema,
    ExtractDocumentTypeFromTypedRxJsonSchema,
    RxJsonSchema
} from 'rxdb';
export const heroSchemaLiteral = {
    title: 'hero schema',
    description: 'describes a human being',
    version: 0,
    keyCompression: true,
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
            type: 'integer'
        }
    },
    required: ['firstName', 'lastName', 'passportId'],
    indexes: ['firstName']
} as const; // <- It is important to set 'as const' to preserve the literal type
const schemaTyped = toTypedRxJsonSchema(heroSchemaLiteral);

// aggregate the document type from the schema
export type HeroDocType = ExtractDocumentTypeFromTypedRxJsonSchema<typeof schemaTyped>;

// create the typed RxJsonSchema from the literal typed object.
export const heroSchema: RxJsonSchema<HeroDocType> = heroSchemaLiteral;
```

**Option B**: Manually type the document type

```typescript
export type HeroDocType = {
    passportId: string;
    firstName: string;
    lastName: string;
    age?: number; // optional
};
```

**Option C**: Generate the document type from schema during build time

If your schema is in a `.json` file or generated from somewhere else, you might generate the typings with the [json-schema-to-typescript](https://www.npmjs.com/package/json-schema-to-typescript) module.

## Types for the ORM methods


We also add some ORM-methods for the document.

```typescript
export type HeroDocMethods = {
    scream: (v: string) => string;
};
```

## Create [RxDocument](../rx-document.md) Type

We can merge these into our HeroDocument.

```typescript
export type HeroDocument = RxDocument<HeroDocType, HeroDocMethods>;
```

## Create [RxCollection](../rx-collection.md) Type

Now we can define type for the collection which contains the documents.

```typescript

// we declare one static ORM-method for the collection
export type HeroCollectionMethods = {
    countAllDocuments: () => Promise<number>;
}

// and then merge all our types
export type HeroCollection = RxCollection<
    HeroDocType,
    HeroDocMethods,
    HeroCollectionMethods
>;
```

## Create [RxDatabase](../rx-database.md) Type

Before we can define the database, we make a helper-type which contains all collections of it.

```typescript
export type MyDatabaseCollections = {
    heroes: HeroCollection
}
```

Now the database.

```typescript
export type MyDatabase = RxDatabase<MyDatabaseCollections>;
```

</Steps>


## Using the types

Now that we have declare all our types, we can use them.


```typescript

/**
 * create database and collections
 */
const myDatabase: MyDatabase = await createRxDatabase<MyDatabaseCollections>({
    name: 'mydb',
    storage: getRxStorageLocalstorage()
});

const heroSchema: RxJsonSchema<HeroDocType> = {
    title: 'human schema',
    description: 'describes a human being',
    version: 0,
    keyCompression: true,
    primaryKey: 'passportId',
    type: 'object',
    properties: {
        passportId: {
            type: 'string'
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
    required: ['passportId', 'firstName', 'lastName']
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
myDatabase.close();
```
