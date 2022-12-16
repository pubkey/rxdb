/**
 * In this file we use RxDB in nodejs
 * We start a couchdb-compliant endpoint
 * that is used by the frontend to replicate all data
 */
import {
    spawn
} from '../../../test/helper/spawn-server';
import {
    HERO_COLLECTION_NAME,
    SYNC_PORT
} from './shared';

async function run() {
    console.log('# create database');

    const server = await spawn(
        HERO_COLLECTION_NAME,
        SYNC_PORT
    );
    console.log(
        '# Started server on ' + server.url
    );
}

run();
