import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import * as RxDB from '../../../../../';
import { RxDatabase } from '../../../../../';


RxDB.plugin(require('../../../../../plugins/adapter-localstorage/'));
// RxDB.plugin(require('pouchdb-adapter-websql'));
// RxDB.plugin(require('pouchdb-adapter-fruitdown'));
// RxDB.plugin(require('pouchdb-adapter-idb'));


RxDB.plugin(require('pouchdb-adapter-http'));
RxDB.plugin(require('pouchdb-replication'));

let collections = [
    {
        name: 'hero',
        schema: RxDB.RxSchema.create(require('../schemas/hero.schema.json')),
        sync: true,
        dbCol: null
    }
];

console.log('hostname: ' + window.location.hostname);
const syncURL = 'http://' + window.location.hostname + ':10101/';

let doSync = true;
if (window.location.hash == '#nosync') doSync = false;

@Injectable()
export class DatabaseService {


    static db$: Observable<RxDatabase> = Observable.fromPromise(RxDB
        .create('heroesDB', 'localstorage', 'myLongAndStupidPassword', true)
        // create collections
        .then(db => {
            window['db'] = db; // write to window for debugging
            console.log('DatabaseService: create collections');
            const fns = collections
                .map(col => db.collection(col.name, col.schema));
            return Promise.all(fns)
                .then((cols) => {
                    collections.map(col => col.dbCol = cols.shift());
                    return db;
                });
        })
        // sync
        .then(db => {
            if (!doSync) return db;
            console.log('DatabaseService: sync');
            collections
                .filter(col => col.sync)
                .map(col => col.dbCol)
                .map(dbCol => dbCol.sync(syncURL + dbCol.name + '/'));
            return db;
        })
        .then(db => {
            console.log('created db:');
            console.dir(db);
            return db;
        })
    );

    get(): Promise<RxDatabase> {
        return DatabaseService.db$.toPromise();
    }
}
