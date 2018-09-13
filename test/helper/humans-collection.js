import clone from 'clone';
import * as schemas from './schemas';
import * as schemaObjects from './schema-objects';

import * as util from '../../dist/lib/util';
import * as RxDatabase from '../../dist/lib/rx-database';

import * as RxDB from '../../dist/lib/index';

export async function create(size = 20, name = 'human', multiInstance = true) {
    if (!name) name = 'human';
    RxDB.PouchDB.plugin(require('pouchdb-adapter-memory'));
    const db = await RxDatabase.create({
        name: util.randomCouchString(10),
        adapter: 'memory',
        multiInstance,
        queryChangeDetection: true,
        ignoreDuplicate: true
    });

    const collection = await db.collection({
        name,
        schema: schemas.human
    });

    // insert data
    await Promise.all(
        new Array(size)
            .fill(0)
            .map(() => collection.insert(schemaObjects.human()))
    );

    return collection;
}

export async function createBySchema(schema, name = 'human') {
    RxDB.PouchDB.plugin(require('pouchdb-adapter-memory'));
    const db = await RxDatabase.create({
        name: util.randomCouchString(10),
        adapter: 'memory',
        multiInstance: true,
        queryChangeDetection: true,
        ignoreDuplicate: true
    });

    const collection = await db.collection({
        name,
        schema
    });

    return collection;
}

export async function createAttachments(size = 20, name = 'human', multiInstance = true) {
    if (!name) name = 'human';
    RxDB.PouchDB.plugin(require('pouchdb-adapter-memory'));
    const db = await RxDatabase.create({
        name: util.randomCouchString(10),
        adapter: 'memory',
        multiInstance,
        queryChangeDetection: true,
        ignoreDuplicate: true
    });

    const schemaJson = clone(schemas.human);
    schemaJson.attachments = {};

    const collection = await db.collection({
        name,
        schema: schemaJson
    });

    // insert data
    const fns = [];
    for (let i = 0; i < size; i++)
        fns.push(collection.insert(schemaObjects.human()));
    await Promise.all(fns);

    return collection;
}

export async function createEncryptedAttachments(size = 20, name = 'human', multiInstance = true) {
    if (!name) name = 'human';
    RxDB.PouchDB.plugin(require('pouchdb-adapter-memory'));
    const db = await RxDatabase.create({
        name: util.randomCouchString(10),
        password: 'foooooobaaaar',
        adapter: 'memory',
        multiInstance,
        queryChangeDetection: true,
        ignoreDuplicate: true
    });

    const schemaJson = clone(schemas.human);
    schemaJson.attachments = {
        encrypted: true
    };

    const collection = await db.collection({
        name,
        schema: schemaJson
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
        adapter: 'memory',
        queryChangeDetection: true,
        ignoreDuplicate: true
    });
    const schemaJSON = clone(schemas.human);
    schemaJSON.keyCompression = false;
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


export async function createAgeIndex(amount = 20) {
    RxDB.PouchDB.plugin(require('pouchdb-adapter-memory'));
    const db = await RxDatabase.create({
        name: util.randomCouchString(10),
        adapter: 'memory',
        queryChangeDetection: true,
        ignoreDuplicate: true
    });
    // setTimeout(() => db.destroy(), dbLifetime);
    const collection = await db.collection({
        name: 'humana',
        schema: schemas.humanAgeIndex
    });

    // insert data
    const fns = [];
    for (let i = 0; i < amount; i++)
        fns.push(collection.insert(schemaObjects.human()));
    await Promise.all(fns);

    return collection;
}


export async function multipleOnSameDB(size = 10) {
    RxDB.PouchDB.plugin(require('pouchdb-adapter-memory'));
    const db = await RxDatabase.create({
        name: util.randomCouchString(10),
        adapter: 'memory',
        queryChangeDetection: true,
        ignoreDuplicate: true
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
        adapter,
        queryChangeDetection: true,
        ignoreDuplicate: true
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
        adapter,
        queryChangeDetection: true,
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
        queryChangeDetection: true,
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
        multiInstance: true,
        queryChangeDetection: true,
        ignoreDuplicate: true
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
        multiInstance: true,
        queryChangeDetection: true,
        ignoreDuplicate: true
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


export async function createMigrationCollection(
    amount = 0,
    addMigrationStrategies = {},
    name = util.randomCouchString(10),
    autoMigrate = false
) {
    const migrationStrategies = {
        1: doc => doc,
        2: doc => doc,
        3: doc => doc
    };

    Object.entries(addMigrationStrategies)
        .forEach(enAr => {
            const fun = enAr.pop();
            const prop = enAr.pop();
            migrationStrategies[prop] = fun;
        });

    const colName = 'human';
    const db = await RxDatabase.create({
        name,
        adapter: 'memory',
        queryChangeDetection: true,
        ignoreDuplicate: true
    });
    const col = await db.collection({
        name: colName,
        schema: schemas.simpleHuman,
        autoMigrate: false
    });

    await Promise.all(
        new Array(amount)
            .fill(0)
            .map(() => col.insert(schemaObjects.simpleHumanAge()))
    );

    col.destroy();
    db.destroy();

    const db2 = await RxDatabase.create({
        name,
        adapter: 'memory',
        queryChangeDetection: true,
        ignoreDuplicate: true
    });
    const col2 = await db2.collection({
        name: colName,
        schema: schemas.simpleHumanV3,
        autoMigrate,
        migrationStrategies
    });

    return col2;
}



export async function createRelated(name = util.randomCouchString(10)) {
    const db = await RxDatabase.create({
        name,
        adapter: 'memory',
        multiInstance: true,
        queryChangeDetection: true,
        ignoreDuplicate: true
    });
    // setTimeout(() => db.destroy(), dbLifetime);
    const collection = await db.collection({
        name: 'human',
        schema: schemas.refHuman
    });

    const doc1 = schemaObjects.refHuman();
    const doc2 = schemaObjects.refHuman(doc1.name);
    doc1.bestFriend = doc2.name; // cross-relation

    await collection.insert(doc1);
    await collection.insert(doc2);

    return collection;
}


export async function createRelatedNested(name = util.randomCouchString(10)) {
    const db = await RxDatabase.create({
        name,
        adapter: 'memory',
        multiInstance: true,
        queryChangeDetection: true,
        ignoreDuplicate: true
    });
    // setTimeout(() => db.destroy(), dbLifetime);
    const collection = await db.collection({
        name: 'human',
        schema: schemas.refHumanNested
    });

    const doc1 = schemaObjects.refHumanNested();
    const doc2 = schemaObjects.refHumanNested(doc1.name);
    doc1.foo.bestFriend = doc2.name; // cross-relation

    await collection.insert(doc1);
    await collection.insert(doc2);

    return collection;
}
