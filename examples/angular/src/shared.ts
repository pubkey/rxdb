export const COUCHDB_PORT = 10101;


export const DATABASE_NAME = 'db';
export const HERO_COLLECTION_NAME = 'hero';

/**
 * We assume that when no indexeddb is there,
 * we are in the server-side rendering nodejs process
 * of angular universal
 */
export const IS_SERVER_SIDE_RENDERING = !global.window || !global.window.indexedDB;
