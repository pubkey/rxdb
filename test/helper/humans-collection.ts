import clone from 'clone';
import * as schemas from './schemas';
import * as schemaObjects from './schema-objects';

import * as util from '../../dist/lib/util';
import {
    create as createRxDatabase,
    RxJsonSchema,
    RxCollection
} from '../../';

import * as RxDB from '../../';

import {
    HumanDocumentType
} from './schema-objects';

export async function create(
    size: number = 20,
    name: string = 'human',
    multiInstance: boolean = true
): Promise<RxCollection<HumanDocumentType>> {
    if (!name) name = 'human';
    RxDB.PouchDB.plugin(require('pouchdb-adapter-memory'));
    const db = await createRxDatabase({
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
    if (size > 0) {
        const docsData = new Array(size)
            .fill(0)
            .map(() => schemaObjects.human());
        await collection.bulkInsert(docsData);
    }
    return collection;
}

export async function createBySchema<RxDocumentType = {}>(
    schema: RxJsonSchema,
    name = 'human'
): Promise<RxCollection<RxDocumentType>> {
    RxDB.PouchDB.plugin(require('pouchdb-adapter-memory'));
    const db = await createRxDatabase({
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
    const db = await createRxDatabase({
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
    if (size > 0) {
        const docsData = new Array(size)
            .fill(0)
            .map(() => schemaObjects.human());
        await collection.bulkInsert(docsData);
    }

    return collection;
}

export async function createEncryptedAttachments(size = 20, name = 'human', multiInstance = true) {
    if (!name) name = 'human';
    RxDB.PouchDB.plugin(require('pouchdb-adapter-memory'));
    const db = await createRxDatabase({
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
    if (size > 0) {
        const docsData = new Array(size)
            .fill(0)
            .map(() => schemaObjects.human());
        await collection.bulkInsert(docsData);
    }

    return collection;
}


export async function createNoCompression(size = 20, name = 'human') {
    RxDB.PouchDB.plugin(require('pouchdb-adapter-memory'));
    const db = await createRxDatabase({
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
    if (size > 0) {
        const docsData = new Array(size)
            .fill(0)
            .map(() => schemaObjects.human());
        await collection.bulkInsert(docsData);
    }

    return collection;
}


export async function createAgeIndex(amount = 20) {
    RxDB.PouchDB.plugin(require('pouchdb-adapter-memory'));
    const db = await createRxDatabase({
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
    if (amount > 0) {
        const docsData = new Array(amount)
            .fill(0)
            .map(() => schemaObjects.human());
        await collection.bulkInsert(docsData);
    }

    return collection;
}


export async function multipleOnSameDB(size = 10) {
    RxDB.PouchDB.plugin(require('pouchdb-adapter-memory'));
    const db = await createRxDatabase({
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
    if (size > 0) {
        const docsData = new Array(size)
            .fill(0)
            .map(() => schemaObjects.human());
        await collection.bulkInsert(docsData);

        const docsData2 = new Array(size)
            .fill(0)
            .map(() => schemaObjects.human());
        await collection2.bulkInsert(docsData2);
    }

    return {
        db,
        collection,
        collection2
    };
}


export async function createNested(amount = 5, adapter = 'memory') {
    RxDB.PouchDB.plugin(require('pouchdb-adapter-memory'));
    const db = await createRxDatabase({
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
    if (amount > 0) {
        const docsData = new Array(amount)
            .fill(0)
            .map(() => schemaObjects.nestedHuman());
        await collection.bulkInsert(docsData);
    }

    return collection;
}

export async function createDeepNested(amount = 5, adapter = 'memory') {
    RxDB.PouchDB.plugin(require('pouchdb-adapter-memory'));
    const db = await createRxDatabase({
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
    if (amount > 0) {
        const docsData = new Array(amount)
            .fill(0)
            .map(() => schemaObjects.deepNestedHuman());
        await collection.bulkInsert(docsData);
    }


    return collection;
}


export async function createEncrypted(
    amount: number = 10
) {
    const db = await createRxDatabase({
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
    if (amount > 0) {
        const docsData = new Array(amount)
            .fill(0)
            .map(() => schemaObjects.encryptedHuman());
        await collection.bulkInsert(docsData);
    }

    return collection;
}

export async function createMultiInstance(
    name: string,
    amount = 0,
    password = null
) {
    const db = await createRxDatabase({
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
    if (amount > 0) {
        const docsData = new Array(amount)
            .fill(0)
            .map(() => schemaObjects.human());
        await collection.bulkInsert(docsData);
    }

    return collection;
}

export async function createPrimary(amount = 10, name = util.randomCouchString(10)) {
    const db = await createRxDatabase({
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
    if (amount > 0) {
        const docsData = new Array(amount)
            .fill(0)
            .map(() => schemaObjects.simpleHuman());
        await collection.bulkInsert(docsData);
    }

    return collection;
}

export async function createHumanWithTimestamp(amount = 0, name = util.randomCouchString(10)) {
    const db = await createRxDatabase({
        name,
        adapter: 'memory',
        multiInstance: true,
        queryChangeDetection: true,
        ignoreDuplicate: true
    });
    // setTimeout(() => db.destroy(), dbLifetime);
    const collection = await db.collection({
        name: 'humans',
        schema: schemas.humanWithTimestamp
    });

    // insert data
    if (amount > 0) {
        const docsData = new Array(amount)
            .fill(0)
            .map(() => schemaObjects.humanWithTimestamp());
        await collection.bulkInsert(docsData);
    }

    return collection;
}

export async function createMigrationCollection(
    amount = 0,
    addMigrationStrategies = {},
    name = util.randomCouchString(10),
    autoMigrate = false
) {
    const migrationStrategies: any = {
        1: (doc: any) => doc,
        2: (doc: any) => doc,
        3: (doc: any) => doc
    };

    Object.entries(addMigrationStrategies)
        .forEach(([prop, fun]) => {
            migrationStrategies[prop] = fun;
        });

    const colName = 'human';
    const db = await createRxDatabase({
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

    const db2 = await createRxDatabase({
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
    RxDB.PouchDB.plugin(require('pouchdb-adapter-memory'));
    const db = await createRxDatabase({
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
    const db = await createRxDatabase({
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
