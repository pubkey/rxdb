import { writable } from 'svelte/store';
import { createRxDatabase, addRxPlugin } from 'rxdb/plugins/core';
import { addPouchPlugin, getRxStoragePouch } from 'rxdb/plugins/pouchdb';
import * as idb from 'pouchdb-adapter-idb';

import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';
import { RxDBValidatePlugin } from 'rxdb/plugins/validate';
import noteSchema from './schema';

/**
 * RxDB ========================================================================
 */

addRxPlugin(RxDBQueryBuilderPlugin);
addRxPlugin(RxDBValidatePlugin);
addPouchPlugin(idb);

let dbPromise;

const _create = async () => {
  const db = await createRxDatabase({
    name: 'rxdbdemo',
    storage: getRxStoragePouch('idb'),
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
