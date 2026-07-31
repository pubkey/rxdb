import { createRxDatabase, addRxPlugin } from 'rxdb';
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';

import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import noteSchema from './schema';

/**
 * RxDB ========================================================================
 */

addRxPlugin(RxDBQueryBuilderPlugin);
addRxPlugin(RxDBDevModePlugin);

let dbPromise;

const _create = async () => {
  const db = await createRxDatabase({
    name: 'rxdbdemo',
    storage: wrappedValidateAjvStorage({
      storage: getRxStorageLocalstorage(),
    })
  });
  await db.addCollections({ notes: { schema: noteSchema } });
  return db;
};

export const db = () => dbPromise ? dbPromise : (dbPromise = _create());

/**
 * Svelte 5 Runes ==============================================================
 * Shared state lives in this `.svelte.js` module so that the `$state` rune
 * can be used outside of a component. Every component that reads a field of
 * `noteForm` re-renders when that field changes.
 */

export const noteForm = $state({
  /**
   * The RxDocument that is currently edited,
   * or null when a new note is written.
   */
  selectedNote: null,
  name: '',
  body: ''
});

export function selectNote(note) {
  noteForm.selectedNote = note;
  noteForm.name = note.name;
  noteForm.body = note.body ?? '';
}

export function resetForm() {
  noteForm.selectedNote = null;
  noteForm.name = '';
  noteForm.body = '';
}
