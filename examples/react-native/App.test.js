import React from 'react';
import { isRxDatabase } from 'rxdb';
import initializeDb, { HeroesCollectionName } from "./initializeDb";

const testDocument = {
    name: 'test',
    color: '#A47706'
}

let db;

it('Database initialization', async () => {
    db = await initializeDb();
    expect(isRxDatabase(db)).toBeTruthy();
});


it(`Add test doc and fetch it from ${HeroesCollectionName} collection`, async () => {
    await db.collections[HeroesCollectionName].upsert(testDocument);
    const docs = await db.collections[HeroesCollectionName].find({ selector: { name: testDocument.name }}).exec();
    expect(docs.length).toBe(1);
});

it(`Destroy db`, async () => {
    await db.destroy();
    expect(true).toBeTruthy();
});
