import { createRxDatabase, addRxPlugin } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/dexie';
import { wrappedKeyCompressionStorage } from 'rxdb/plugins/key-compression';
import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';
import { wrappedKeyEncryptionStorage } from 'rxdb/plugins/encryption';
import { NoteSchema, MyDatabaseCollections } from './schema';

addRxPlugin(RxDBQueryBuilderPlugin);

const _create = async () => {
  const database = await createRxDatabase<MyDatabaseCollections>({
    name: 'rxdbdemo',
    storage: wrappedKeyEncryptionStorage({
      storage: wrappedKeyCompressionStorage({
        storage: getRxStorageDexie(),
      }),
    }),
    password: 'foooooobaaaaar',
    multiInstance: true,
    ignoreDuplicate: true,
  });
  await database.addCollections({ notes: { schema: NoteSchema } });
  return database;
};

export const db = () => _create();
