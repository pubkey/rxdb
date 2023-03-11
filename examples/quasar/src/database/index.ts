import { createRxDatabase, addRxPlugin } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';
import { RxDBUpdatePlugin } from 'rxdb/plugins/update';
import { RxDBLeaderElectionPlugin } from 'rxdb/plugins/leader-election';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import { Notify } from 'quasar';

import {
  RxHeroDocument,
  RxHeroesCollections,
  RxHeroDocumentType,
} from 'src/types/hero';
import heroSchema from 'src/schemas/hero';

export async function createDatabase() {
  if (process.env.DEV) {
    addRxPlugin(RxDBDevModePlugin);
  }
  addRxPlugin(RxDBUpdatePlugin);
  addRxPlugin(RxDBLeaderElectionPlugin);

  const db = await createRxDatabase<RxHeroesCollections>({
    name: 'heroes',
    storage: wrappedValidateAjvStorage({
      storage: getRxStorageDexie(),
    }),
  });

  // await db.waitForLeadership();
  await db.addCollections({
    heroes: {
      schema: heroSchema,
      methods: {
        hpPercent(this: RxHeroDocument): number {
          return (this.hp / this.maxHP) * 100;
        },
      },
    },
  });

  db.collections.heroes.preInsert((docObj: RxHeroDocumentType) => {
    const color = docObj.color;
    return db.collections.heroes
      .findOne({
        selector: {
          color,
        },
      })
      .exec()
      .then((has: RxHeroDocument | null) => {
        if (has != null) {
          Notify.create({
            message: 'another hero already has the color ' + color,
            color: 'warning',
          });
          throw new Error('color already there');
        }
        return db;
      });
  }, true);

  return db;
}

type ExtractGeneric<Type> = Type extends Promise<infer X> ? X : never;
export type Database = ExtractGeneric<ReturnType<typeof createDatabase>>;
