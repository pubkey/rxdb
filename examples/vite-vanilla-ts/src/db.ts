import { createRxDatabase, addRxPlugin } from 'rxdb';
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';
import { wrappedKeyCompressionStorage } from 'rxdb/plugins/key-compression';
import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';
import { wrappedKeyEncryptionCryptoJsStorage } from 'rxdb/plugins/encryption-crypto-js';
import { HeroSchema, MyDatabaseCollections } from './schema';

import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';

addRxPlugin(RxDBQueryBuilderPlugin);
addRxPlugin(RxDBDevModePlugin);

const _create = async () => {
  const database = await createRxDatabase<MyDatabaseCollections>({
    name: 'rxdbdemo',
    storage: wrappedValidateAjvStorage({
      storage: wrappedKeyEncryptionCryptoJsStorage({
        storage: wrappedKeyCompressionStorage({
          storage: getRxStorageLocalstorage(),
        }),
      })
    }),
    ignoreDuplicate: true,
    password: 'foooooobaaaaar',
    multiInstance: true
  });
  await database.addCollections({ heroes: { schema: HeroSchema } });
  return database;
};

export const db = () => _create();
