import { Injectable } from "@angular/core";

import * as RxDB from "../../../../../";
import { QueryChangeDetector, RxDatabase } from "../../../../../";

QueryChangeDetector.enable();
QueryChangeDetector.enableDebugging();

const adapters = {
  localstorage: require('../../../../../plugins/adapter-localstorage/'),
  websql: require('pouchdb-adapter-websql'),
  idb: require('pouchdb-adapter-idb')
};

const useAdapter = 'idb';
RxDB.plugin(adapters[useAdapter]);

RxDB.plugin(require('pouchdb-adapter-http'));

let collections = [
  {
    name: 'hero',
    schema: require('../schemas/hero.schema.json'),
    methods: {
      hpPercent() {
        return this.hp / this.maxHP * 100;
      }
    },
    sync: true
  }
];

console.log('hostname: ' + window.location.hostname);
const syncURL = 'http://' + window.location.hostname + ':10101/';

let doSync = true;
if (window.location.hash == '#nosync') doSync = false;

@Injectable()
export class DatabaseService {
  static dbPromise: Promise<RxDatabase> = null;

  private async _create(): Promise<RxDatabase> {
    console.log('DatabaseService: creating database..');
    const db = await RxDB.create({ name: 'heroesdb', adapter: useAdapter, password: 'myLongAndStupidPassword' });
    console.log('DatabaseService: created database');
    window['db'] = db; // write to window for debugging

    // show leadership in title
    db.waitForLeadership()
      .then(() => {
        console.log('isLeader now');
        document.title = '♛ ' + document.title;
      });

    // create collections
    console.log('DatabaseService: create collections');
    await Promise.all(collections.map(colData => db.collection(<any>colData)));

    // hooks
    console.log('DatabaseService: add hooks');
    db.collections.hero.preInsert(function (docObj) {
      const color = docObj.color;
      return db.collections.hero.findOne({ color }).exec()
        .then(has => {
          if (has != null) {
            alert('another hero already has the color ' + color);
            throw new Error('color already there');
          }
          return db;
        });
    });

    // sync
    console.log('DatabaseService: sync');
    collections
      .filter(col => col.sync)
      .map(col => col.name)
      .forEach(colName => db[colName].sync({ remote: syncURL + colName + '/' }));

    return db;
  }

  get(): Promise<RxDatabase> {
    if (DatabaseService.dbPromise)
      return DatabaseService.dbPromise;

    // create database
    DatabaseService.dbPromise = this._create();
    return DatabaseService.dbPromise;
  }
}
