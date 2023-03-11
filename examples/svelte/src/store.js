import { writable } from 'svelte/store';
import { createRxDatabase, addRxPlugin } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';

import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';
import noteSchema from './schema';

/**
 * RxDB ========================================================================
 */

addRxPlugin(RxDBQueryBuilderPlugin);

let dbPromise;

const _create = async () => {
  const db = await createRxDatabase({
    name: 'rxdbdemo',
    storage: wrappedValidateAjvStorage({
      storage: getRxStorageDexie(),
    }),
    /*
      The line below is confusing. I understand it is needed because vite rebuilds and reruns my app for any change to the code. 
      The documentation for ignoreDuplicate says there are RARE cases where this should be set to true, but don't all frameworks
      rebuild the app on every change? So we would always need ignoreDuplicate: true? To be honest I think createRxDatabase
      should just return the database if it exists, like Dexie does, without throwing an error. Alternatively the documentation 
      for ignoreDuplicate should be updated to say set to true during development, or something to that effect. 
    */
    ignoreDuplicate: true
  });
  await db.addCollections({ notes: { schema: noteSchema } });
  dbPromise = db;
  return db;
};

export const db = () => dbPromise ? dbPromise : _create();

/**
 * Svelte Writables ============================================================
 */

export const noteList = writable([]);
export const selectedNote = writable({});
export const name = writable('');
export const body = writable('');
