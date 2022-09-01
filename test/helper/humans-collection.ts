import clone from 'clone';
import * as schemas from './schemas';
import * as schemaObjects from './schema-objects';
import config from '../unit/config';

import {
    createRxDatabase,
    RxJsonSchema,
    RxCollection,
    RxDatabase,
    randomCouchString
} from '../../';

import {
    addPouchPlugin
} from '../../plugins/pouchdb';

import { MigrationStrategies, RxAttachmentCreator, RxStorage } from '../../src/types';
import { HumanDocumentType } from './schemas';

export async function create(
    size: number = 20,
    collectionName: string = 'human',
    multiInstance: boolean = true,
    eventReduce: boolean = true,
    storage: RxStorage<any, any> = config.storage.getStorage()

): Promise<RxCollection<HumanDocumentType, {}, {}>> {
    const db = await createRxDatabase<{ human: RxCollection<HumanDocumentType> }>({
        name: randomCouchString(10),
        storage,
        multiInstance,
        eventReduce,
        ignoreDuplicate: true,
        localDocuments: true
    });

    const collections = await db.addCollections({
        [collectionName]: {
            schema: schemas.human,
            localDocuments: true
        }
    });

    // insert data
    if (size > 0) {
        const docsData = new Array(size)
            .fill(0)
            .map(() => schemaObjects.human());
        await collections[collectionName].bulkInsert(docsData);
    }
    return collections[collectionName];
}

export async function createBySchema<RxDocumentType = {}>(
    schema: RxJsonSchema<RxDocumentType>,
    name = 'human',
    storage = config.storage.getStorage()
): Promise<RxCollection<RxDocumentType, {}, {}>> {
    const db = await createRxDatabase<{ [prop: string]: RxCollection<RxDocumentType> }>({
        name: randomCouchString(10),
        storage,
        multiInstance: true,
        eventReduce: true,
        ignoreDuplicate: true
    });

    const collections = await db.addCollections({
        [name]: {
            schema
        }
    });

    return collections[name];
}

export async function createAttachments(
    size = 20,
    name = 'human',
    multiInstance = true
): Promise<RxCollection<HumanDocumentType, {}, {}>> {
    if (!name) {
        name = 'human';
    }
    const db = await createRxDatabase<{ [prop: string]: RxCollection<HumanDocumentType> }>({
        name: randomCouchString(10),
        storage: config.storage.getStorage(),
        multiInstance,
        eventReduce: true,
        ignoreDuplicate: true
    });

    const schemaJson = clone(schemas.human);
    schemaJson.attachments = {};

    const collections = await db.addCollections({
        [name]: {
            schema: schemaJson
        }
    });

    // insert data
    if (size > 0) {
        const docsData = new Array(size)
            .fill(0)
            .map(() => schemaObjects.human());
        await collections[name].bulkInsert(docsData);
    }

    return collections[name];
}

export async function createNoCompression(
    size = 20,
    name = 'human'
): Promise<RxCollection<HumanDocumentType>> {
    const db = await createRxDatabase<{ [prop: string]: RxCollection<HumanDocumentType> }>({
        name: randomCouchString(10),
        storage: config.storage.getStorage(),
        eventReduce: true,
        ignoreDuplicate: true
    });
    const schemaJSON = clone(schemas.human);
    schemaJSON.keyCompression = false;
    // setTimeout(() => db.destroy(), dbLifetime);
    const collections = await db.addCollections({
        [name]: {
            schema: schemaJSON
        }
    });

    // insert data
    if (size > 0) {
        const docsData = new Array(size)
            .fill(0)
            .map(() => schemaObjects.human());
        await collections[name].bulkInsert(docsData);
    }

    return collections[name];
}

export async function createAgeIndex(
    amount = 20
): Promise<RxCollection<HumanDocumentType>> {
    const db = await createRxDatabase<{ humana: RxCollection<HumanDocumentType> }>({
        name: randomCouchString(10),
        storage: config.storage.getStorage(),
        eventReduce: true,
        ignoreDuplicate: true
    });
    // setTimeout(() => db.destroy(), dbLifetime);
    const collections = await db.addCollections({
        humana: {
            schema: schemas.humanAgeIndex
        }
    });

    // insert data
    if (amount > 0) {
        const docsData = new Array(amount)
            .fill(0)
            .map(() => schemaObjects.human());
        await collections.humana.bulkInsert(docsData);
    }

    return collections.humana;
}

export async function multipleOnSameDB(
    size = 10
): Promise<{
    db: RxDatabase<{
        human: RxCollection<HumanDocumentType>;
        human2: RxCollection<HumanDocumentType>;
    }>,
    collection: RxCollection<HumanDocumentType>
    collection2: RxCollection<HumanDocumentType>
}> {
    const db = await createRxDatabase<{
        human: RxCollection<HumanDocumentType>,
        human2: RxCollection<HumanDocumentType>
    }>({
        name: randomCouchString(10),
        storage: config.storage.getStorage(),
        eventReduce: true,
        ignoreDuplicate: true
    });
    // setTimeout(() => db.destroy(), dbLifetime);
    const collections = await db.addCollections({
        human: {
            schema: schemas.human
        },
        human2: {
            schema: schemas.human
        }
    });

    // insert data
    if (size > 0) {
        const docsData = new Array(size)
            .fill(0)
            .map(() => schemaObjects.human());
        await collections.human.bulkInsert(docsData);

        const docsData2 = new Array(size)
            .fill(0)
            .map(() => schemaObjects.human());
        await collections.human2.bulkInsert(docsData2);
    }

    return {
        db,
        collection: collections.human,
        collection2: collections.human2
    };
}

export async function createNested(
    amount = 5
): Promise<RxCollection<schemaObjects.NestedHumanDocumentType>> {
    const db = await createRxDatabase<{ nestedhuman: RxCollection<schemaObjects.NestedHumanDocumentType> }>({
        name: randomCouchString(10),
        storage: config.storage.getStorage(),
        eventReduce: true,
        ignoreDuplicate: true
    });
    // setTimeout(() => db.destroy(), dbLifetime);
    const collections = await db.addCollections({
        nestedhuman: {
            schema: schemas.nestedHuman
        }
    });

    // insert data
    if (amount > 0) {
        const docsData = new Array(amount)
            .fill(0)
            .map(() => schemaObjects.nestedHuman());
        await collections.nestedhuman.bulkInsert(docsData);
    }

    return collections.nestedhuman;
}

export async function createDeepNested(
    amount = 5
): Promise<RxCollection<schemaObjects.DeepNestedHumanDocumentType>> {
    const db = await createRxDatabase<{ nestedhuman: RxCollection<schemaObjects.DeepNestedHumanDocumentType> }>({
        name: randomCouchString(10),
        storage: config.storage.getStorage(),
        eventReduce: true,
    });
    // setTimeout(() => db.destroy(), dbLifetime);
    const collections = await db.addCollections({
        nestedhuman: {
            schema: schemas.deepNestedHuman
        }
    });

    // insert data
    if (amount > 0) {
        const docsData = new Array(amount)
            .fill(0)
            .map(() => schemaObjects.deepNestedHuman());
        await collections.nestedhuman.bulkInsert(docsData);
    }

    return collections.nestedhuman;
}

export async function createMultiInstance(
    name: string,
    amount = 0,
    password = null,
    storage: RxStorage<any, any> = config.storage.getStorage()
): Promise<RxCollection<HumanDocumentType, {}, {}>> {
    const db = await createRxDatabase<{ human: RxCollection<HumanDocumentType> }>({
        name,
        storage,
        password,
        multiInstance: true,
        eventReduce: true,
        ignoreDuplicate: true,
        localDocuments: true
    });
    // setTimeout(() => db.destroy(), dbLifetime);
    const collections = await db.addCollections({
        human: {
            schema: schemas.human,
            localDocuments: true
        }
    });
    // insert data
    if (amount > 0) {
        const docsData = new Array(amount)
            .fill(0)
            .map(() => schemaObjects.human());
        await collections.human.bulkInsert(docsData);
    }

    return collections.human;
}

export async function createPrimary(
    amount = 10,
    name = randomCouchString(10)
): Promise<RxCollection<schemaObjects.SimpleHumanDocumentType>> {

    const db = await createRxDatabase<{ human: RxCollection<schemaObjects.SimpleHumanDocumentType> }>({
        name,
        storage: config.storage.getStorage(),
        multiInstance: true,
        eventReduce: true,
        ignoreDuplicate: true
    });
    // setTimeout(() => db.destroy(), dbLifetime);
    const collections = await db.addCollections({
        human: {
            schema: schemas.primaryHuman
        }
    });

    // insert data
    if (amount > 0) {
        const docsData = new Array(amount)
            .fill(0)
            .map(() => schemaObjects.simpleHuman());
        await collections.human.bulkInsert(docsData);
    }

    return collections.human;
}

export async function createHumanWithTimestamp(
    amount = 0,
    databaseName = randomCouchString(10),
    multiInstance = true,
    storage = config.storage.getStorage()
): Promise<RxCollection<schemaObjects.HumanWithTimestampDocumentType>> {

    const db = await createRxDatabase<{ humans: RxCollection<schemaObjects.HumanWithTimestampDocumentType> }>({
        name: databaseName,
        storage,
        multiInstance,
        eventReduce: true,
        ignoreDuplicate: true
    });
    // setTimeout(() => db.destroy(), dbLifetime);
    const collections = await db.addCollections({
        humans: {
            schema: schemas.humanWithTimestamp
        }
    });

    // insert data
    if (amount > 0) {
        const docsData = new Array(amount)
            .fill(0)
            .map(() => schemaObjects.humanWithTimestamp());
        await collections.humans.bulkInsert(docsData);
    }

    return collections.humans;
}

export async function createMigrationCollection(
    amount = 0,
    addMigrationStrategies: MigrationStrategies = {},
    name = randomCouchString(10),
    autoMigrate = false,
    attachment?: RxAttachmentCreator
): Promise<RxCollection<schemaObjects.SimpleHumanV3DocumentType>> {

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
    const db = await createRxDatabase<{ human: RxCollection<schemaObjects.SimpleHumanAgeDocumentType> }>({
        name,
        storage: config.storage.getStorage(),
        eventReduce: true,
        ignoreDuplicate: true
    });
    const cols = await db.addCollections({
        [colName]: {
            schema: attachment !== undefined ? { ...schemas.simpleHuman, attachments: {} } : schemas.simpleHuman,
            autoMigrate: false
        }
    });

    await Promise.all(
        new Array(amount)
            .fill(0)
            .map(() => cols[colName].insert(schemaObjects.simpleHumanAge()).then(doc => {
                if (attachment !== undefined) {
                    return doc.putAttachment(attachment, true);
                }
            }))
    );

    cols[colName].destroy();
    await db.destroy();

    const db2 = await createRxDatabase<{ human: RxCollection<schemaObjects.SimpleHumanV3DocumentType> }>({
        name,
        storage: config.storage.getStorage(),
        eventReduce: true,
        ignoreDuplicate: true
    });
    const cols2 = await db2.addCollections({
        [colName]: {
            schema: attachment !== undefined ? { ...schemas.simpleHumanV3, attachments: {} } : schemas.simpleHumanV3,
            autoMigrate,
            migrationStrategies
        }
    });

    return cols2[colName];
}

export async function createRelated(
    name = randomCouchString(10)
): Promise<RxCollection<schemaObjects.RefHumanDocumentType>> {
    addPouchPlugin(require('pouchdb-adapter-memory'));

    const db = await createRxDatabase<{ human: RxCollection<schemaObjects.RefHumanDocumentType> }>({
        name,
        storage: config.storage.getStorage(),
        multiInstance: true,
        eventReduce: true,
        ignoreDuplicate: true
    });
    // setTimeout(() => db.destroy(), dbLifetime);
    const collections = await db.addCollections({
        human: {
            schema: schemas.refHuman
        }
    });

    const doc1 = schemaObjects.refHuman();
    const doc2 = schemaObjects.refHuman(doc1.name);
    doc1.bestFriend = doc2.name; // cross-relation

    await collections.human.insert(doc1);
    await collections.human.insert(doc2);

    return collections.human;
}

export async function createRelatedNested(
    name = randomCouchString(10)
): Promise<RxCollection<schemaObjects.RefHumanNestedDocumentType>> {

    const db = await createRxDatabase<{ human: RxCollection<schemaObjects.RefHumanNestedDocumentType> }>({
        name,
        storage: config.storage.getStorage(),
        multiInstance: true,
        eventReduce: true,
        ignoreDuplicate: true
    });
    // setTimeout(() => db.destroy(), dbLifetime);
    const collections = await db.addCollections({
        human: {
            schema: schemas.refHumanNested
        }
    });

    const doc1 = schemaObjects.refHumanNested();
    const doc2 = schemaObjects.refHumanNested(doc1.name);
    doc1.foo.bestFriend = doc2.name; // cross-relation

    await collections.human.insert(doc1);
    await collections.human.insert(doc2);

    return collections.human;
}

export async function createIdAndAgeIndex(
    amount = 20
): Promise<RxCollection<schemaObjects.HumanWithIdAndAgeIndexDocumentType>> {
    const db = await createRxDatabase<{ humana: RxCollection<schemaObjects.HumanWithIdAndAgeIndexDocumentType> }>({
        name: randomCouchString(10),
        storage: config.storage.getStorage(),
        eventReduce: true,
        ignoreDuplicate: true
    });
    // setTimeout(() => db.destroy(), dbLifetime);
    const collections = await db.addCollections({
        humana: {
            schema: schemas.humanIdAndAgeIndex
        }
    });

    // insert data
    if (amount > 0) {
        const docsData = new Array(amount)
            .fill(0)
            .map(() => schemaObjects.humanWithIdAndAgeIndexDocumentType());
        await collections.humana.bulkInsert(docsData);
    }

    return collections.humana;
}
