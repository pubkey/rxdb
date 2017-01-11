import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import * as RxDB from '../../../../../';
import { RxDatabase } from '../../../../../';



const adapters = {
    localstorage: require('../../../../../plugins/adapter-localstorage/'),
    websql: require('pouchdb-adapter-websql'),
    idb: require('pouchdb-adapter-idb')
};

const useAdapter = 'idb';
RxDB.plugin(adapters[useAdapter]);


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
        .create('heroesDB', useAdapter, 'myLongAndStupidPassword', true)
        // create collections
        .then(db => {
            console.log('created database');
            window['db'] = db; // write to window for debugging

            db.waitForLeadership()
                .then(() => {
                    console.log('isLeader now');
                    document.title = '♛ ' + document.title;
                });
            console.log('DatabaseService: create collections');
            const fns = collections
                .map(col => db.collection(col.name, col.schema));
            return Promise.all(fns)
                .then((cols) => {
                    collections.map(col => col.dbCol = cols.shift());
                    return db;
                });
        })
        // hooks
        .then(db => {
          db.collections.hero.preInsert(async function(docObj){
            const color = docObj.color;
            const has = await db.collections.hero.findOne({color}).exec();

            if(has!=null){
              alert('another hero already has the color ' + color);
              throw new Error('color already there');
            }
          });
          return db;
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
            console.log('created collections');
            return db;
        })
    );

    get(): Promise<RxDatabase> {
        return DatabaseService.db$.toPromise();
    }
}
