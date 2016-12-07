import {
    default as randomToken
} from 'random-token';

import * as schemas from './schemas';
import * as schemaObjects from './schema-objects';

import * as RxDatabase from '../../dist/lib/RxDatabase';
import * as util from '../../dist/lib/util';

import * as RxDB from '../../dist/lib/index';

const dbLifetime = 1000 * 3; // db.destroy() will be called after this time

export async function create(size = 20, name = 'human') {
    RxDB.PouchDB.plugin(require('pouchdb-adapter-memory'));
    const db = await RxDatabase.create(randomToken(10), 'memory');
    setTimeout(() => db.destroy(), dbLifetime);
    const collection = await db.collection(name, schemas.human);

    // insert data
    const fns = [];
    for (let i = 0; i < size; i++)
        fns.push(collection.insert(schemaObjects.human()));
    await Promise.all(fns);

    return collection;
}


export async function createAgeIndex() {
    RxDB.PouchDB.plugin(require('pouchdb-adapter-memory'));
    const db = await RxDatabase.create(randomToken(10), 'memory');
    setTimeout(() => db.destroy(), dbLifetime);
    const collection = await db.collection('humana', schemas.humanAgeIndex);

    // insert data
    const fns = [];
    for (let i = 0; i < 20; i++)
        fns.push(collection.insert(schemaObjects.human()));
    await Promise.all(fns);

    return collection;
}


export async function multipleOnSameDB() {
    RxDB.PouchDB.plugin(require('pouchdb-adapter-memory'));
    const db = await RxDatabase.create(randomToken(10), 'memory');
    setTimeout(() => db.destroy(), dbLifetime);
    const collection = await db.collection('human', schemas.human);
    const collection2 = await db.collection('human2', schemas.human);

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
    const db = await RxDatabase.create(randomToken(10), adapter);
    setTimeout(() => db.destroy(), dbLifetime);
    const collection = await db.collection('nestedHuman', schemas.nestedHuman);

    // insert data
    const fns = [];
    for (let i = 0; i < amount; i++)
        fns.push(collection.insert(schemaObjects.nestedHuman()));
    await Promise.all(fns);


    return collection;
}



export async function createEncrypted(amount = 10) {
    const db = await RxDatabase.create(randomToken(10), 'memory', randomToken(10));
    setTimeout(() => db.destroy(), dbLifetime);
    const collection = await db.collection('encryptedhuman', schemas.encryptedHuman);

    // insert data
    const fns = [];
    for (let i = 0; i < amount; i++)
        fns.push(collection.insert(schemaObjects.encryptedHuman()));
    await Promise.all(fns);

    return collection;
}


export async function createMultiInstance(prefix, amount = 0, password = null) {
    const db = await RxDatabase.create(prefix, 'memory', password, true);
    setTimeout(() => db.destroy(), dbLifetime);
    const collection = await db.collection('human', schemas.human);

    // insert data
    const fns = [];
    for (let i = 0; i < amount; i++)
        fns.push(collection.insert(schemaObjects.human()));
    await Promise.all(fns);

    return collection;
}


export async function createPrimary(amount = 10, name = randomToken(10)) {
    const db = await RxDatabase.create(name, 'memory', null, true);
    setTimeout(() => db.destroy(), dbLifetime);
    const collection = await db.collection('encryptedhuman', schemas.primaryHuman);

    // insert data
    const fns = [];
    for (let i = 0; i < amount; i++)
        fns.push(collection.insert(schemaObjects.simpleHuman()));
    await Promise.all(fns);

    return collection;
}
