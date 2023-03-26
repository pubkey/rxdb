import { createRxDatabase, addRxPlugin } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';
import { RxDBUpdatePlugin } from 'rxdb/plugins/update';
import { RxDBLeaderElectionPlugin } from 'rxdb/plugins/leader-election';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import { Notify } from 'quasar';
import { replicateRxCollection } from 'rxdb/plugins/replication';
import { lastOfArray } from 'rxdb';

import {
  RxHeroDocument,
  RxHeroesCollections,
  RxHeroDocumentType,
} from 'src/types/hero';
import { RxHeroSchema } from 'src/schemas/hero';
import { HeroesService, Hero, HeroQuery } from 'app/src-ssr/api/heroes';
import { RxDatabase } from 'src/boot/database';
import { FeathersService } from '@feathersjs/feathers/lib';
import { FeathersApp } from 'app/src-ssr/api';

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
      schema: RxHeroSchema,
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

export async function syncHeroes(
  db: RxDatabase,
  heroesApi: FeathersService<FeathersApp, HeroesService>
) {
  const replicationState = await replicateRxCollection({
    collection: db.collections.heroes,
    /**
     * An id for the replication to identify it
     * and so that RxDB is able to resume the replication on app reload.
     * If you replicate with a remote server, it is recommended to put the
     * server url into the replicationIdentifier.
     */
    replicationIdentifier: '/api/heroes',
    live: true,
    /**
     * Optional,
     * only needed when you want to replicate local changes to the remote instance.
     */
    push: {
      async handler(
        docs: { assumedMasterState?: Hero; newDocumentState?: Hero }[]
      ) {
        const createDocs = docs
          .filter((doc) => !doc.assumedMasterState)
          .map((doc) => doc.newDocumentState as Hero);
        const updateDocs = docs
          .filter((doc) => doc.assumedMasterState)
          .map((doc) => doc.newDocumentState as Hero);
        const responses: Hero[] = [];
        for (const createDoc of createDocs) {
          const response = await heroesApi.create(createDoc);
          responses.push(response);
        }
        for (const updateDoc of updateDocs) {
          if (updateDoc.id) {
            const response = await heroesApi.patch(updateDoc.id, updateDoc);
            responses.push(response);
          }
        }

        console.log('pull', responses);
        const conflicts = responses.filter(() => false).map((res) => res);
        return conflicts as never;
      },
      batchSize: 5,
    },
    pull: {
      /**
       * Pull handler
       */
      // RxDocType, CheckpointType
      async handler(lastCheckpoint, batchSize) {
        let minTimestamp = 0;
        if (lastCheckpoint && typeof lastCheckpoint === 'object') {
          const checkpoint = lastCheckpoint as { updatedAt?: number };
          minTimestamp = checkpoint.updatedAt || 0;
        }
        const query: HeroQuery = {
          $limit: batchSize,
          updatedAt: {
            $gte: minTimestamp,
          }
        }
        const { data } = await heroesApi.find({
          query,
        });
        console.log(data);

        // await db.collections.heroes.bulkUpsert(data);
        const res = {
          documents: data as never,
          checkpoint:
            data.length === 0
              ? lastCheckpoint
              : {
                  id: lastOfArray(data)?.id,
                  updatedAt: lastOfArray(data)?.updatedAt,
                },
        };
        return res;
      },
      batchSize: 10,
    },
  });
  setInterval(() => replicationState.reSync(), 5 * 1000);
}

type ExtractGeneric<Type> = Type extends Promise<infer X> ? X : never;
export type Database = ExtractGeneric<ReturnType<typeof createDatabase>>;
