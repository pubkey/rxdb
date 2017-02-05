import {
    default as clone
} from 'clone';

import * as schemas from './schemas';
import * as schemaObjects from './schema-objects';

import * as RxDatabase from '../../dist/lib/RxDatabase';
import * as util from '../../dist/lib/util';

import * as RxDB from '../../dist/lib/index';

const dbLifetime = 1000 * 2; // db.destroy() will be called after this time

export async function create(size = 20, name = 'human') {
    RxDB.PouchDB.plugin(require('pouchdb-adapter-memory'));
    const db = await RxDatabase.create({
        name: util.randomCouchString(10),
        adapter: 'memory'
    });
    // setTimeout(() => db.destroy(), dbLifetime);
    const collection = await db.collection({
        name,
        schema: schemas.human
    });

    // insert data
    const fns = [];
    for (let i = 0; i < size; i++)
        fns.push(collection.insert(schemaObjects.human()));
    await Promise.all(fns);

    return collection;
}


export async function createNoCompression(size = 20, name = 'human') {
    RxDB.PouchDB.plugin(require('pouchdb-adapter-memory'));
    const db = await RxDatabase.create({
        name: util.randomCouchString(10),
        adapter: 'memory'
    });
    const schemaJSON = clone(schemas.human);
    schemaJSON.disableKeyCompression = true;
    // setTimeout(() => db.destroy(), dbLifetime);
    const collection = await db.collection({
        name,
        schema: schemaJSON
    });

    // insert data
    const fns = [];
    for (let i = 0; i < size; i++)
        fns.push(collection.insert(schemaObjects.human()));
    await Promise.all(fns);

    return collection;
}


export async function createAgeIndex() {
    RxDB.PouchDB.plugin(require('pouchdb-adapter-memory'));
    const db = await RxDatabase.create({
        name: util.randomCouchString(10),
        adapter: 'memory'
    });
    // setTimeout(() => db.destroy(), dbLifetime);
    const collection = await db.collection({
        name: 'humana',
        schema: schemas.humanAgeIndex
    });

    // insert data
    const fns = [];
    for (let i = 0; i < 20; i++)
        fns.push(collection.insert(schemaObjects.human()));
    await Promise.all(fns);

    return collection;
}


export async function multipleOnSameDB() {
    RxDB.PouchDB.plugin(require('pouchdb-adapter-memory'));
    const db = await RxDatabase.create({
        name: util.randomCouchString(10),
        adapter: 'memory'
    });
    // setTimeout(() => db.destroy(), dbLifetime);
    const collection = await db.collection({
        name: 'human',
        schema: schemas.human
    });
    const collection2 = await db.collection({
        name: 'human2',
        schema: schemas.human
    });

    // insert data
    for (let i = 0; i < size; i++) {
        await collection.insert(schemaObjects.human());
        await collection2.insert(schemaObjects.human());
    }
    return {
        db,
        collection,
        collection2
    };
}


export async function createNested(amount = 5, adapter = 'memory') {
    RxDB.PouchDB.plugin(require('pouchdb-adapter-memory'));
    const db = await RxDatabase.create({
        name: util.randomCouchString(10),
        adapter
    });
    // setTimeout(() => db.destroy(), dbLifetime);
    const collection = await db.collection({
        name: 'nestedhuman',
        schema: schemas.nestedHuman
    });

    // insert data
    const fns = [];
    for (let i = 0; i < amount; i++)
        fns.push(collection.insert(schemaObjects.nestedHuman()));
    await Promise.all(fns);


    return collection;
}

export async function createDeepNested(amount = 5, adapter = 'memory') {
    RxDB.PouchDB.plugin(require('pouchdb-adapter-memory'));
    const db = await RxDatabase.create({
        name: util.randomCouchString(10),
        adapter
    });
    // setTimeout(() => db.destroy(), dbLifetime);
    const collection = await db.collection({
        name: 'nestedhuman',
        schema: schemas.deepNestedHuman
    });

    // insert data
    const fns = [];
    for (let i = 0; i < amount; i++)
        fns.push(collection.insert(schemaObjects.deepNestedHuman()));
    await Promise.all(fns);


    return collection;
}


export async function createEncrypted(amount = 10) {
    const db = await RxDatabase.create({
        name: util.randomCouchString(10),
        adapter: 'memory',
        password: util.randomCouchString(10)
    });
    // setTimeout(() => db.destroy(), dbLifetime);
    const collection = await db.collection({
        name: 'encryptedhuman',
        schema: schemas.encryptedHuman
    });

    // insert data
    const fns = [];
    for (let i = 0; i < amount; i++)
        fns.push(collection.insert(schemaObjects.encryptedHuman()));
    await Promise.all(fns);

    return collection;
}


export async function createMultiInstance(name, amount = 0, password = null) {
    const db = await RxDatabase.create({
        name,
        adapter: 'memory',
        password,
        multiInstance: true
    });
    // setTimeout(() => db.destroy(), dbLifetime);
    const collection = await db.collection({
        name: 'human',
        schema: schemas.human
    });
    // insert data
    const fns = [];
    for (let i = 0; i < amount; i++)
        fns.push(collection.insert(schemaObjects.human()));
    await Promise.all(fns);

    return collection;
}


export async function createPrimary(amount = 10, name = util.randomCouchString(10)) {
    const db = await RxDatabase.create({
        name,
        adapter: 'memory',
        multiInstance: true
    });
    // setTimeout(() => db.destroy(), dbLifetime);
    const collection = await db.collection({
        name: 'encryptedhuman',
        schema: schemas.primaryHuman
    });

    // insert data
    const fns = [];
    for (let i = 0; i < amount; i++)
        fns.push(collection.insert(schemaObjects.simpleHuman()));
    await Promise.all(fns);

    return collection;
}
