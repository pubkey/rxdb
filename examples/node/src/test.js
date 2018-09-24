/**
 * used in the ci to ensure everything works
 */
require('babel-polyfill');
const Database = require('./database');
const Log = require('./log');
const random = require('random-name');
const randomColor = require('./random-color');


async function run() {
    const db = await Database.get();
    await upsertHero();
    const heroes = await db.heroes.find().exec();
    if (heroes.length !== 1) {
        console.error('heroes not found');
        process.exit(1);
    } else {
        process.exit();
    }
}

const upsertHero = async () => {
    try {
        const db = await Database.get();
        return db.heroes.addHero(random(), randomColor());
    } catch (e) {
        Log.error(e);
    }
};
run();
