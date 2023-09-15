const {
    MongoClient
} = require('mongodb');

/**
 * This file connects to the mongoDB database
 * and does an insert.
 * It is used in the CI to await the time it takes
 * the database containers to start up.
 */
async function run() {
    console.log('MongoDB Tester: start');
    const dbName = 'mydb' + new Date().getTime();
    const mongoClient = new MongoClient('mongodb://localhost:27017');
    console.log('MongoDB Tester: created client');
    const mongoDatabase = mongoClient.db(dbName);
    const mongoCollection = await mongoDatabase.createCollection('mycollection');
    console.log('MongoDB Tester: created collection');
    await mongoCollection.insertOne({ foo: 'bar' });

    console.log('MongoDB Tester: DONE');

    await mongoClient.close();
}
run();
