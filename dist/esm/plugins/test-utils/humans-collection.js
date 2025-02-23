import clone from 'clone';
import * as schemas from "./schemas.js";
import * as schemaObjects from "./schema-objects.js";
import { getConfig } from "./config.js";
import assert from 'assert';
import { createRxDatabase, randomToken } from "../../index.js";
export async function create(size = 20, collectionName = 'human', multiInstance = true, eventReduce = true, storage = getConfig().storage.getStorage()) {
  var db = await createRxDatabase({
    name: randomToken(10),
    storage,
    multiInstance,
    eventReduce,
    ignoreDuplicate: true,
    localDocuments: true
  });
  var collections = await db.addCollections({
    [collectionName]: {
      schema: schemas.human,
      localDocuments: true
    }
  });

  // insert data
  if (size > 0) {
    var docsData = new Array(size).fill(0).map(() => schemaObjects.humanData());
    var writeResult = await collections[collectionName].bulkInsert(docsData);
    assert.deepStrictEqual(writeResult.error, []);
  }
  return collections[collectionName];
}
export async function createBySchema(schema, name = 'human', storage = getConfig().storage.getStorage(), migrationStrategies) {
  var db = await createRxDatabase({
    name: randomToken(10),
    storage,
    multiInstance: true,
    eventReduce: true,
    ignoreDuplicate: true
  });
  var collections = await db.addCollections({
    [name]: {
      schema,
      migrationStrategies
    }
  });
  return collections[name];
}
export async function createAttachments(size = 20, name = 'human', multiInstance = true) {
  if (!name) {
    name = 'human';
  }
  var db = await createRxDatabase({
    name: randomToken(10),
    storage: getConfig().storage.getStorage(),
    multiInstance,
    eventReduce: true,
    ignoreDuplicate: true
  });
  var schemaJson = clone(schemas.human);
  schemaJson.attachments = {};
  var collections = await db.addCollections({
    [name]: {
      schema: schemaJson
    }
  });

  // insert data
  if (size > 0) {
    var docsData = new Array(size).fill(0).map(() => schemaObjects.humanData());
    await collections[name].bulkInsert(docsData);
  }
  return collections[name];
}
export async function createNoCompression(size = 20, name = 'human') {
  var db = await createRxDatabase({
    name: randomToken(10),
    storage: getConfig().storage.getStorage(),
    eventReduce: true,
    ignoreDuplicate: true
  });
  var schemaJSON = clone(schemas.human);
  schemaJSON.keyCompression = false;
  // setTimeout(() => db.close(), dbLifetime);
  var collections = await db.addCollections({
    [name]: {
      schema: schemaJSON
    }
  });

  // insert data
  if (size > 0) {
    var docsData = new Array(size).fill(0).map(() => schemaObjects.humanData());
    await collections[name].bulkInsert(docsData);
  }
  return collections[name];
}
export async function createAgeIndex(amount = 20) {
  var db = await createRxDatabase({
    name: randomToken(10),
    storage: getConfig().storage.getStorage(),
    eventReduce: true,
    ignoreDuplicate: true
  });
  // setTimeout(() => db.close(), dbLifetime);
  var collections = await db.addCollections({
    humana: {
      schema: schemas.humanAgeIndex
    }
  });

  // insert data
  if (amount > 0) {
    var docsData = new Array(amount).fill(0).map(() => schemaObjects.humanData());
    await collections.humana.bulkInsert(docsData);
  }
  return collections.humana;
}
export async function multipleOnSameDB(size = 10) {
  var db = await createRxDatabase({
    name: randomToken(10),
    storage: getConfig().storage.getStorage(),
    eventReduce: true,
    ignoreDuplicate: true
  });
  // setTimeout(() => db.close(), dbLifetime);
  var collections = await db.addCollections({
    human: {
      schema: schemas.human
    },
    human2: {
      schema: schemas.human
    }
  });

  // insert data
  if (size > 0) {
    var docsData = new Array(size).fill(0).map(() => schemaObjects.humanData());
    await collections.human.bulkInsert(docsData);
    var docsData2 = new Array(size).fill(0).map(() => schemaObjects.humanData());
    await collections.human2.bulkInsert(docsData2);
  }
  return {
    db,
    collection: collections.human,
    collection2: collections.human2
  };
}
export async function createNested(amount = 5) {
  var db = await createRxDatabase({
    name: randomToken(10),
    storage: getConfig().storage.getStorage(),
    eventReduce: true,
    ignoreDuplicate: true
  });
  // setTimeout(() => db.close(), dbLifetime);
  var collections = await db.addCollections({
    nestedhuman: {
      schema: schemas.nestedHuman
    }
  });

  // insert data
  if (amount > 0) {
    var docsData = new Array(amount).fill(0).map(() => schemaObjects.nestedHumanData());
    await collections.nestedhuman.bulkInsert(docsData);
  }
  return collections.nestedhuman;
}
export async function createDeepNested(amount = 5) {
  var db = await createRxDatabase({
    name: randomToken(10),
    storage: getConfig().storage.getStorage(),
    eventReduce: true
  });
  // setTimeout(() => db.close(), dbLifetime);
  var collections = await db.addCollections({
    nestedhuman: {
      schema: schemas.deepNestedHuman
    }
  });

  // insert data
  if (amount > 0) {
    var docsData = new Array(amount).fill(0).map(() => schemaObjects.deepNestedHumanData());
    await collections.nestedhuman.bulkInsert(docsData);
  }
  return collections.nestedhuman;
}
export async function createMultiInstance(name, amount = 0, password = undefined, storage = getConfig().storage.getStorage()) {
  if (!getConfig().storage.hasMultiInstance) {
    throw new Error('createMultiInstance() cannot be called on a storage with hasMultiInstance:false');
  }
  var db = await createRxDatabase({
    name,
    storage,
    password,
    multiInstance: true,
    eventReduce: true,
    ignoreDuplicate: true,
    localDocuments: true
  });
  // setTimeout(() => db.close(), dbLifetime);
  var collections = await db.addCollections({
    human: {
      schema: schemas.human,
      localDocuments: true
    }
  });
  // insert data
  if (amount > 0) {
    var docsData = new Array(amount).fill(0).map(() => schemaObjects.humanData());
    await collections.human.bulkInsert(docsData);
  }
  return collections.human;
}
export async function createPrimary(amount = 10, name = randomToken(10)) {
  var db = await createRxDatabase({
    name,
    storage: getConfig().storage.getStorage(),
    multiInstance: true,
    eventReduce: true,
    ignoreDuplicate: true
  });
  // setTimeout(() => db.close(), dbLifetime);
  var collections = await db.addCollections({
    human: {
      schema: schemas.primaryHuman
    }
  });

  // insert data
  if (amount > 0) {
    var docsData = new Array(amount).fill(0).map(() => schemaObjects.simpleHumanData());
    await collections.human.bulkInsert(docsData);
  }
  return collections.human;
}
export async function createHumanWithTimestamp(amount = 0, databaseName = randomToken(10), multiInstance = true, storage = getConfig().storage.getStorage(), conflictHandler) {
  var db = await createRxDatabase({
    name: databaseName,
    storage,
    multiInstance,
    eventReduce: true,
    ignoreDuplicate: true
  });
  // setTimeout(() => db.close(), dbLifetime);
  var collections = await db.addCollections({
    humans: {
      conflictHandler,
      schema: schemas.humanWithTimestamp
    }
  });

  // insert data
  if (amount > 0) {
    var docsData = new Array(amount).fill(0).map(() => schemaObjects.humanWithTimestampData());
    await collections.humans.bulkInsert(docsData);
  }
  return collections.humans;
}
export async function createMigrationCollection(amount = 0, addMigrationStrategies = {}, name = randomToken(10), autoMigrate = false, attachment) {
  var migrationStrategies = Object.assign({
    1: doc => doc,
    2: doc => doc,
    3: doc => {
      doc.age = parseInt(doc.age, 10);
      return doc;
    }
  }, addMigrationStrategies);
  var colName = 'human';
  var db = await createRxDatabase({
    name,
    storage: getConfig().storage.getStorage(),
    eventReduce: true,
    ignoreDuplicate: true
  });
  var cols = await db.addCollections({
    [colName]: {
      schema: attachment !== undefined ? {
        ...schemas.simpleHuman,
        attachments: {}
      } : schemas.simpleHuman,
      autoMigrate: false
    }
  });
  await Promise.all(new Array(amount).fill(0).map(() => cols[colName].insert(schemaObjects.simpleHumanAge()).then(doc => {
    if (attachment !== undefined) {
      return doc.putAttachment(attachment);
    }
  })));
  await db.close();
  var db2 = await createRxDatabase({
    name,
    storage: getConfig().storage.getStorage(),
    eventReduce: true,
    ignoreDuplicate: true
  });
  var cols2 = await db2.addCollections({
    [colName]: {
      schema: attachment !== undefined ? {
        ...schemas.simpleHumanV3,
        attachments: {}
      } : schemas.simpleHumanV3,
      autoMigrate,
      migrationStrategies
    }
  });
  return cols2[colName];
}
export async function createRelated(name = randomToken(10)) {
  var db = await createRxDatabase({
    name,
    storage: getConfig().storage.getStorage(),
    multiInstance: true,
    eventReduce: true,
    ignoreDuplicate: true
  });
  // setTimeout(() => db.close(), dbLifetime);
  var collections = await db.addCollections({
    human: {
      schema: schemas.refHuman
    }
  });
  var doc1 = schemaObjects.refHumanData();
  var doc2 = schemaObjects.refHumanData(doc1.name);
  doc1.bestFriend = doc2.name; // cross-relation

  await collections.human.insert(doc1);
  await collections.human.insert(doc2);
  return collections.human;
}
export async function createRelatedNested(name = randomToken(10)) {
  var db = await createRxDatabase({
    name,
    storage: getConfig().storage.getStorage(),
    multiInstance: true,
    eventReduce: true,
    ignoreDuplicate: true
  });
  // setTimeout(() => db.close(), dbLifetime);
  var collections = await db.addCollections({
    human: {
      schema: schemas.refHumanNested
    }
  });
  var doc1 = schemaObjects.refHumanNestedData();
  var doc2 = schemaObjects.refHumanNestedData(doc1.name);
  doc1.foo.bestFriend = doc2.name; // cross-relation

  await collections.human.insert(doc1);
  await collections.human.insert(doc2);
  return collections.human;
}
export async function createIdAndAgeIndex(amount = 20) {
  var db = await createRxDatabase({
    name: randomToken(10),
    storage: getConfig().storage.getStorage(),
    eventReduce: true,
    ignoreDuplicate: true
  });
  // setTimeout(() => db.close(), dbLifetime);
  var collections = await db.addCollections({
    humana: {
      schema: schemas.humanIdAndAgeIndex
    }
  });

  // insert data
  if (amount > 0) {
    var docsData = new Array(amount).fill(0).map(() => schemaObjects.humanWithIdAndAgeIndexDocumentType());
    await collections.humana.bulkInsert(docsData);
  }
  return collections.humana;
}
export async function createHumanWithOwnership(amount = 20, databaseName = randomToken(10), multiInstance = true, owner = "alice", storage = getConfig().storage.getStorage(), conflictHandler) {
  var db = await createRxDatabase({
    name: databaseName,
    storage,
    multiInstance,
    eventReduce: true,
    ignoreDuplicate: true
  });
  // setTimeout(() => db.close(), dbLifetime);
  var collections = await db.addCollections({
    humans: {
      conflictHandler,
      schema: schemas.humanWithOwnership
    }
  });

  // insert data
  if (amount > 0) {
    var docsData = new Array(amount).fill(0).map(() => schemaObjects.humanWithOwnershipData({}, owner));
    await collections.humans.bulkInsert(docsData);
  }
  return collections.humans;
}
//# sourceMappingURL=humans-collection.js.map