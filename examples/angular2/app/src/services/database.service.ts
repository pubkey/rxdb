import { Injectable } from '@angular/core';
// import typings
import * as RxDBTypes from './../RxDB.d';


// batteries-included
// import RxDB from 'rxdb';

/**
 * custom build
 */
import RxDB from 'rxdb/plugins/core';

// import modules
import RxDBSchemaCheckModule from 'rxdb/plugins/schema-check';
if (ENV === 'development') {
    // schema-checks should be used in dev-mode only
    RxDB.plugin(RxDBSchemaCheckModule);
}

import RxDBValidateModule from 'rxdb/plugins/validate';
RxDB.plugin(RxDBValidateModule);
import RxDBLeaderElectionModule from 'rxdb/plugins/leader-election';
RxDB.plugin(RxDBLeaderElectionModule);

import RxDBReplicationModule from 'rxdb/plugins/replication';
RxDB.plugin(RxDBReplicationModule);
// always needed for replication with the node-server
RxDB.plugin(require('pouchdb-adapter-http'));



RxDB.QueryChangeDetector.enable();
RxDB.QueryChangeDetector.enableDebugging();

import PouchdbAdapterIdb from 'pouchdb-adapter-idb';
RxDB.plugin(PouchdbAdapterIdb);
const useAdapter = 'idb';


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
    static dbPromise: Promise<RxDBTypes.RxHeroesDatabase> = null;
    private async _create(): Promise<RxDBTypes.RxHeroesDatabase> {
        console.log('DatabaseService: creating database..');
        const db: RxDBTypes.RxHeroesDatabase = await RxDB.create({
            name: 'heroes',
            adapter: useAdapter,
            // password: 'myLongAndStupidPassword' // no password needed
        });
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
        await Promise.all(collections.map(colData => db.collection(colData)));

        // hooks
        console.log('DatabaseService: add hooks');
        db.collections.hero.preInsert(function(docObj) {
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

    get(): Promise<RxDBTypes.RxHeroesDatabase> {
        if (DatabaseService.dbPromise)
            return DatabaseService.dbPromise;

        // create database
        DatabaseService.dbPromise = this._create();
        return DatabaseService.dbPromise;
    }
}
