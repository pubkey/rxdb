import React from 'react'
import { isRxDatabase } from 'rxdb'
import initializeDb, { HeroesCollectionName } from "./initializeDb"

const testDocument = {
    name: 'test',
    color: '#A47706'
}

let db

it('Database initialization', async () => {
    db = await initializeDb()
    expect(isRxDatabase(db)).toBeTruthy()
});


it(`Add to and fetch from ${HeroesCollectionName} collection`, async () => {
    await db.collections[HeroesCollectionName].upsert(testDocument)
    const docs = await db.collections[HeroesCollectionName].find({ selector: { name: 'test' }}).exec()
    db.destroy()
    expect(docs.length).toBe(1);
});
