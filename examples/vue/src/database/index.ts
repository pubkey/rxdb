import { inject, Plugin } from 'vue';
import { createRxDatabase, addRxPlugin } from 'rxdb';

const KEY_DATABASE = Symbol('database');

// import typings
import {
  RxHeroDocument,
  RxHeroesDatabase,
  RxHeroesCollections,
  RxHeroDocumentType,
} from '../RxDB';

import heroSchema from '../schemas/Hero.schema';

import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';

// import modules
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';

if (process.env.NODE_ENV === 'development') {
  // in dev-mode we add the dev-mode plugin
  // which does many checks and adds full error messages
  addRxPlugin(RxDBDevModePlugin);
}

import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';

import { RxDBLeaderElectionPlugin } from 'rxdb/plugins/leader-election';
addRxPlugin(RxDBLeaderElectionPlugin);

import { replicateCouchDB } from 'rxdb/plugins/replication-couchdb';

console.log('hostname: ' + window.location.hostname);
const syncURL = 'http://' + window.location.hostname + ':10101/';

export function useDatabase(): RxHeroesDatabase {
  return inject(KEY_DATABASE) as RxHeroesDatabase;
}

export async function createDatabase(): Promise<Plugin> {
  console.log('DatabaseService: creating database..');
  const db = await createRxDatabase<RxHeroesCollections>({
    name: 'heroes',
    storage: wrappedValidateAjvStorage({
      storage: getRxStorageLocalstorage()
    })
    // password: 'myLongAndStupidPassword' // no password needed
  });
  console.log('DatabaseService: created database');
  (window as any).db = db; // write to window for debugging

  // show leadership in title
  db.waitForLeadership().then(() => {
    console.log('isLeader now');
    document.title = '♛ ' + document.title;
  });

  // create collections
  console.log('DatabaseService: create collections');

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

  // hooks
  console.log('DatabaseService: add hooks');
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
          alert('another hero already has the color ' + color);
          throw new Error('color already there');
        }
        return db;
      });
  }, true);

  // sync
  console.log('DatabaseService: sync');
  await Promise.all(
    Object.values(db.collections).map(async (col) => {
      try {
        // create the CouchDB database
        await fetch(
          syncURL + col.name + '/',
          {
            method: 'PUT'
          }
        );
      } catch (err) {
        console.dir(err);
      }
    })
  );
  console.log('DatabaseService: sync - start live');
  Object.values(db.collections).map((col: any) => {
    const colName = col.name;
    const url = syncURL + colName + '/';
    console.log('url: ' + url);
    const replicationState = replicateCouchDB({
      replicationIdentifier: 'my-vue-couch-replication',
      collection: col,
      url,
      live: true,
      pull: {},
      push: {},
      autoStart: true
    });
    replicationState.error$.subscribe((err: any) => {
      console.log('Got replication error:');
      console.dir(err);
    });
  });

  return {
    install(app: any) {
      app.provide(KEY_DATABASE, db);
    },
  };
}
