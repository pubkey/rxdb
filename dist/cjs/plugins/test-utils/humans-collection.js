"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.create = create;
exports.createAgeIndex = createAgeIndex;
exports.createAttachments = createAttachments;
exports.createBySchema = createBySchema;
exports.createDeepNested = createDeepNested;
exports.createHumanWithOwnership = createHumanWithOwnership;
exports.createHumanWithTimestamp = createHumanWithTimestamp;
exports.createIdAndAgeIndex = createIdAndAgeIndex;
exports.createMigrationCollection = createMigrationCollection;
exports.createMultiInstance = createMultiInstance;
exports.createNested = createNested;
exports.createNoCompression = createNoCompression;
exports.createPrimary = createPrimary;
exports.createRelated = createRelated;
exports.createRelatedNested = createRelatedNested;
exports.multipleOnSameDB = multipleOnSameDB;
var _clone = _interopRequireDefault(require("clone"));
var schemas = _interopRequireWildcard(require("./schemas.js"));
var schemaObjects = _interopRequireWildcard(require("./schema-objects.js"));
var _config = require("./config.js");
var _assert = _interopRequireDefault(require("assert"));
var _index = require("../../index.js");
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
async function create(size = 20, collectionName = 'human', multiInstance = true, eventReduce = true, storage = (0, _config.getConfig)().storage.getStorage()) {
  var db = await (0, _index.createRxDatabase)({
    name: (0, _index.randomToken)(10),
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
    _assert.default.deepStrictEqual(writeResult.error, []);
  }
  return collections[collectionName];
}
async function createBySchema(schema, name = 'human', storage = (0, _config.getConfig)().storage.getStorage(), migrationStrategies) {
  var db = await (0, _index.createRxDatabase)({
    name: (0, _index.randomToken)(10),
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
async function createAttachments(size = 20, name = 'human', multiInstance = true) {
  if (!name) {
    name = 'human';
  }
  var db = await (0, _index.createRxDatabase)({
    name: (0, _index.randomToken)(10),
    storage: (0, _config.getConfig)().storage.getStorage(),
    multiInstance,
    eventReduce: true,
    ignoreDuplicate: true
  });
  var schemaJson = (0, _clone.default)(schemas.human);
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
async function createNoCompression(size = 20, name = 'human') {
  var db = await (0, _index.createRxDatabase)({
    name: (0, _index.randomToken)(10),
    storage: (0, _config.getConfig)().storage.getStorage(),
    eventReduce: true,
    ignoreDuplicate: true
  });
  var schemaJSON = (0, _clone.default)(schemas.human);
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
async function createAgeIndex(amount = 20) {
  var db = await (0, _index.createRxDatabase)({
    name: (0, _index.randomToken)(10),
    storage: (0, _config.getConfig)().storage.getStorage(),
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
async function multipleOnSameDB(size = 10) {
  var db = await (0, _index.createRxDatabase)({
    name: (0, _index.randomToken)(10),
    storage: (0, _config.getConfig)().storage.getStorage(),
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
async function createNested(amount = 5) {
  var db = await (0, _index.createRxDatabase)({
    name: (0, _index.randomToken)(10),
    storage: (0, _config.getConfig)().storage.getStorage(),
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
async function createDeepNested(amount = 5) {
  var db = await (0, _index.createRxDatabase)({
    name: (0, _index.randomToken)(10),
    storage: (0, _config.getConfig)().storage.getStorage(),
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
async function createMultiInstance(name, amount = 0, password = undefined, storage = (0, _config.getConfig)().storage.getStorage()) {
  if (!(0, _config.getConfig)().storage.hasMultiInstance) {
    throw new Error('createMultiInstance() cannot be called on a storage with hasMultiInstance:false');
  }
  var db = await (0, _index.createRxDatabase)({
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
async function createPrimary(amount = 10, name = (0, _index.randomToken)(10)) {
  var db = await (0, _index.createRxDatabase)({
    name,
    storage: (0, _config.getConfig)().storage.getStorage(),
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
async function createHumanWithTimestamp(amount = 0, databaseName = (0, _index.randomToken)(10), multiInstance = true, storage = (0, _config.getConfig)().storage.getStorage(), conflictHandler) {
  var db = await (0, _index.createRxDatabase)({
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
async function createMigrationCollection(amount = 0, addMigrationStrategies = {}, name = (0, _index.randomToken)(10), autoMigrate = false, attachment) {
  var migrationStrategies = Object.assign({
    1: doc => doc,
    2: doc => doc,
    3: doc => {
      doc.age = parseInt(doc.age, 10);
      return doc;
    }
  }, addMigrationStrategies);
  var colName = 'human';
  var db = await (0, _index.createRxDatabase)({
    name,
    storage: (0, _config.getConfig)().storage.getStorage(),
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
  var db2 = await (0, _index.createRxDatabase)({
    name,
    storage: (0, _config.getConfig)().storage.getStorage(),
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
async function createRelated(name = (0, _index.randomToken)(10)) {
  var db = await (0, _index.createRxDatabase)({
    name,
    storage: (0, _config.getConfig)().storage.getStorage(),
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
async function createRelatedNested(name = (0, _index.randomToken)(10)) {
  var db = await (0, _index.createRxDatabase)({
    name,
    storage: (0, _config.getConfig)().storage.getStorage(),
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
async function createIdAndAgeIndex(amount = 20) {
  var db = await (0, _index.createRxDatabase)({
    name: (0, _index.randomToken)(10),
    storage: (0, _config.getConfig)().storage.getStorage(),
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
async function createHumanWithOwnership(amount = 20, databaseName = (0, _index.randomToken)(10), multiInstance = true, owner = "alice", storage = (0, _config.getConfig)().storage.getStorage(), conflictHandler) {
  var db = await (0, _index.createRxDatabase)({
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