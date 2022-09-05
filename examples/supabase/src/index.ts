
import {

    createRxDatabase,
    addRxPlugin,
    RxStorage
} from 'rxdb';

import {
    RxDBDevModePlugin
} from 'rxdb/plugins/dev-mode';
addRxPlugin(RxDBDevModePlugin); // TODO only add this in dev mode

import {
    getRxStorageDexie
} from 'rxdb/plugins/dexie';
import {
    getRxStorageMemory
} from 'rxdb/plugins/memory';
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';

import { RxDBLeaderElectionPlugin } from 'rxdb/plugins/leader-election';
addRxPlugin(RxDBLeaderElectionPlugin);



import { heroSchema } from './hero.schema';
import { RxHeroesCollections } from './types';
import { addClickHandlers } from './handlers';
import { startReplication } from './replication';



const heroesList = document.querySelector('#heroes-list');
function getStorageKey(): string {
    const url_string = window.location.href;
    const url = new URL(url_string);
    let storageKey = url.searchParams.get('storage');
    if (!storageKey) {
        storageKey = 'dexie';
    }
    return storageKey;
}

/**
 * Easy toggle of the storage engine via query parameter.
 */
function getStorage(): RxStorage<any, any> {
    const storageKey = getStorageKey();

    if (storageKey === 'memory') {
        return getRxStorageMemory();
    } else if (storageKey === 'dexie') {
        return getRxStorageDexie();
    } else {
        throw new Error('storage key not defined ' + storageKey);
    }
}


async function run() {
    console.log('run()');

    heroesList.innerHTML = 'Create database..';
    const database = await createRxDatabase<RxHeroesCollections>({
        name: 'supabase-example-db',
        storage: wrappedValidateAjvStorage({
            storage: getStorage()
        }),
        multiInstance: true
    });
    heroesList.innerHTML = 'Create collection..';
    await database.addCollections({
        heroes: {
            schema: heroSchema
        }
    });

    heroesList.innerHTML = 'Subscribe to query..';
    database.heroes
        .find({
            sort: [{ name: 'asc' }]
        }).$
        .subscribe(heroes => {
            // console.log('emitted heroes:');
            // console.dir(heroes.map(d => d.toJSON()));
            let html = '';
            heroes.forEach(hero => {
                html += `
                    <li class="hero-item">
                        <div class="color-box" style="background:${hero.color}"></div>
                        <div class="name">${hero.name} (updatedAt: ${hero.updatedAt})</div>
                        <div class="delete-icon" onclick="window.deleteHero('${hero.primary}')">DELETE</div>
                    </li>
                `;
            });
            heroesList.innerHTML = html;
        });


    startReplication(database);
    addClickHandlers(database);
}
run();
