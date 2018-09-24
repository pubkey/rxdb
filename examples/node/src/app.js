require('babel-polyfill');
const Database = require('./database');
const Log = require('./log');
const keypress = require('keypress');
const random = require('random-name');
const randomColor = require('./random-color');

const start = async () => {
    Log.intro();
    observeHeroes();
    Log.explanation();
    keypress(process.stdin);
    process.stdin.on('keypress', async ch => {
        switch (ch) {
            case '\r':
                await upsertHero();
                break;
            case '\u0003':
                process.exit();
                break;
            default:
                Log.explanation();
                break;
        }
    });
    process.stdin.setRawMode(true);
    process.stdin.resume();
};

const upsertHero = async () => {
    try {
        const db = await Database.get();
        return db.heroes.addHero(random(), randomColor());
    } catch (e) {
        Log.error(e);
    }
};

const observeHeroes = async () => {
    try {
        const db = await Database.get();
        Log.createdDB();
        db.heroes.find()
            .sort({
                name: 1
            }).$
            .subscribe(heroes => {
                if (!heroes) return;
                Log.heroCollectionUpdate();
                heroes.forEach(hero => Log.logHero(hero));
            });
    } catch (e) {
        Log.error(e);
    }
};

start();
