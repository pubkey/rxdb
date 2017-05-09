require('babel-polyfill');
const Database = require('./database');
const Log = require('./log');
const keypress = require('keypress');
const random = require('random-name');
const randomColor = require('./random-color');

const start = async() => {
    Log.intro();
    await Database.get();
    Log.explanation();
    keypress(process.stdin);
    process.stdin.on('keypress', async ch => {
        switch (ch) {
            case '\r':
                await Database.upsertHero(random(), randomColor());
                break;
            case '\u0003':
                process.exit();
            default:
                Log.explanation();
                break;
        }
    });
    process.stdin.setRawMode(true);
    process.stdin.resume();
};

start();
