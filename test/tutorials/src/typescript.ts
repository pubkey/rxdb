/**
 * this is the test for the typescript-tutorial
 * IMPORTANT: whenever you change something here,
 * ensure it is also changed in /docs-src/tutorials/typescript.md
 */

// import types
import {
    RxDatabase,
    RxCollection,
    RxJsonSchema,
    RxDocument,
    addRxPlugin,
    createRxDatabase
} from 'rxdb';

import * as MemoryAdapter from 'pouchdb-adapter-memory';
addRxPlugin(MemoryAdapter);

/**
 * declare types
 */

type HeroDocType = {
    passportId: string;
    firstName: string;
    lastName: string;
    age?: number; // optional
};

type HeroDocMethods = {
    scream: (v: string) => string;
};

type HeroDocument = RxDocument<HeroDocType, HeroDocMethods>;

type HeroCollectionMethods = {
    countAllDocuments: () => Promise<number>;
}

type HeroCollection = RxCollection<HeroDocType, HeroDocMethods, HeroCollectionMethods>;

type MyDatabaseCollections = {
    heroes: HeroCollection
}

type MyDatabase = RxDatabase<MyDatabaseCollections>;

async function run() {
    /**
     * create database and collections
     */
    const myDatabase: MyDatabase = await createRxDatabase<MyDatabaseCollections>({
        name: 'mydb',
        adapter: 'memory'
    });

    const heroSchema: RxJsonSchema = {
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
        scream: function (this: HeroDocument, what: string) {
            return this.firstName + ' screams: ' + what.toUpperCase();
        }
    };

    const heroCollectionMethods: HeroCollectionMethods = {
        countAllDocuments: async function (this: HeroCollection) {
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

    // add a preInsert-hook
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
}

run();
