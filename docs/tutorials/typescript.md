# TypeScript Setup

> Use RxDB with TypeScript to define typed schemas, create typed collections, and build fully typed ORM methods. A quick step-by-step guide.

import {Steps} from '@site/src/components/steps';

# Using RxDB with TypeScript

<!-- IMPORTANT: When you edit this file, apply the same changes to test/tutorials/src/typescript.ts -->

In this tutorial you will learn how to use RxDB with TypeScript.
We will create a basic database with one collection and several [ORM](../orm.md)-methods, fully typed!

RxDB directly comes with its typings and you do not have to install anything else. The latest version of RxDB requires TypeScript v3.8 or newer. All types are exported from `rxdb`, see the [import reference](../install.md#import-reference) for the full list of type and plugin imports. How to type a replication is shown in [using the replication with TypeScript](../replication.md#using-the-replication-with-typescript).
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
import {
    getRxStorageLocalstorage
} from 'rxdb/plugins/storage-localstorage';
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
export const todoSchemaLiteral = {
    title: 'todo schema',
    description: 'describes a single todo item',
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: {
            type: 'string',
            maxLength: 100 // <- the primary key must have set maxLength
        },
        name: {
            type: 'string'
        },
        done: {
            type: 'boolean',
            default: false
        },
        dueAt: {
            type: 'string',
            format: 'date-time',
            maxLength: 30
        },
        priority: {
            type: 'integer',
            minimum: 0,
            maximum: 10,
            multipleOf: 1
        },
        note: {
            type: 'string'
        }
    },
    required: ['id', 'name', 'done', 'dueAt', 'priority'],
    indexes: ['dueAt']
} as const; // <- It is important to set 'as const' to preserve the literal type
const schemaTyped = toTypedRxJsonSchema(todoSchemaLiteral);

// aggregate the document type from the schema
export type TodoDocType =
    ExtractDocumentTypeFromTypedRxJsonSchema<
        typeof schemaTyped
    >;

// create the typed RxJsonSchema from the literal typed object.
export const todoSchema: RxJsonSchema<TodoDocType> = todoSchemaLiteral;
```

**Option B**: Manually type the document type

```typescript
export type TodoDocType = {
    id: string;
    name: string;
    done: boolean;
    dueAt: string;
    priority: number;
    note?: string; // optional
};
```

**Option C**: Generate the document type from schema during build time

If your schema is in a `.json` file or generated from somewhere else, you might generate the typings with the [json-schema-to-typescript](https://www.npmjs.com/package/json-schema-to-typescript) module.

## Types for the ORM methods

We also add some ORM-methods for the document.

```typescript
export type TodoDocMethods = {
    describe: (prefix: string) => string;
};
```

## Create [RxDocument](../rx-document.md) Type

We can merge these into our TodoDocument.

```typescript
export type TodoDocument = RxDocument<TodoDocType, TodoDocMethods>;
```

## Create [RxCollection](../rx-collection.md) Type

Now we can define type for the collection which contains the documents.

```typescript

// we declare one static ORM-method for the collection
export type TodoCollectionMethods = {
    countAllDocuments: () => Promise<number>;
}

// and then merge all our types
export type TodoCollection = RxCollection<
    TodoDocType,
    TodoDocMethods,
    TodoCollectionMethods
>;
```

## Create [RxDatabase](../rx-database.md) Type

Before we can define the database, we make a helper-type which contains all collections of it.

```typescript
export type MyDatabaseCollections = {
    todos: TodoCollection
}
```

Now the database.

```typescript
export type MyDatabase = RxDatabase<MyDatabaseCollections>;
```

</Steps>

## Using the types

Now that we have declared all our types, we can use them.

```typescript

/**
 * create database and collections
 */
const myDatabase: MyDatabase = await createRxDatabase<MyDatabaseCollections>({
    name: 'mydb',
    storage: getRxStorageLocalstorage()
});

const todoSchema: RxJsonSchema<TodoDocType> = {
    title: 'todo schema',
    description: 'describes a single todo item',
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: {
            type: 'string',
            maxLength: 100
        },
        name: {
            type: 'string'
        },
        done: {
            type: 'boolean',
            default: false
        },
        dueAt: {
            type: 'string',
            format: 'date-time',
            maxLength: 30
        },
        priority: {
            type: 'integer',
            minimum: 0,
            maximum: 10,
            multipleOf: 1
        },
        note: {
            type: 'string'
        }
    },
    required: ['id', 'name', 'done', 'dueAt', 'priority'],
    indexes: ['dueAt']
};

const todoDocMethods: TodoDocMethods = {
    describe: function(this: TodoDocument, prefix: string) {
        return prefix + ': ' + this.name + ' (priority ' + this.priority + ')';
    }
};

const todoCollectionMethods: TodoCollectionMethods = {
    countAllDocuments: async function(this: TodoCollection) {
        const allDocs = await this.find().exec();
        return allDocs.length;
    }
};

await myDatabase.addCollections({
    todos: {
        schema: todoSchema,
        methods: todoDocMethods,
        statics: todoCollectionMethods
    }
});

// add a postInsert-hook
myDatabase.todos.postInsert(
    function myPostInsertHook(
        this: TodoCollection, // own collection is bound to the scope
        docData: TodoDocType, // documents data
        doc: TodoDocument // RxDocument
    ) {
        console.log('insert to ' + this.name + '-collection: ' + doc.name);
    },
    false // not async
);

/**
 * use the database
 */

// insert a document
const todo: TodoDocument = await myDatabase.todos.insert({
    id: 'todo1',
    name: 'Learn RxDB',
    done: false,
    dueAt: '2026-01-01T10:00:00.000Z',
    priority: 8
});

// access a property
console.log(todo.name);
// > 'Learn RxDB'

// use a orm method
console.log(todo.describe('Next'));
// > 'Next: Learn RxDB (priority 8)'

// use a static orm method from the collection
const amount: number = await myDatabase.todos.countAllDocuments();
console.log(amount);
// > 1

/**
 * clean up
 */
myDatabase.close();
```
