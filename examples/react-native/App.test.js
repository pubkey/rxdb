import React from 'react';
import { isRxDatabase } from 'rxdb';
import initializeDb, { HeroesCollectionName } from "./initializeDb";
import { STORAGE_MEMORY } from './storage';

const testDocument = {
    name: 'test',
    color: '#A47706'
}

let db;

it('Database initialization', async () => {
    db = await initializeDb(undefined, STORAGE_MEMORY);
    expect(isRxDatabase(db)).toBeTruthy();
});


it(`Add test doc and fetch it from ${HeroesCollectionName} collection`, async () => {
    await db.collections[HeroesCollectionName].upsert(testDocument);
    const docs = await db.collections[HeroesCollectionName].find({ selector: { name: testDocument.name }}).exec();
    expect(docs.length).toBe(1);
});

it(`close db`, async () => {
    await db.close();
    expect(true).toBeTruthy();
});
