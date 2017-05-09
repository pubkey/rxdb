require('babel-polyfill');
const Database = require('./database');
const Log = require('./log');

const start = async() => {
    Log.intro();
    await Database.get();
};

start();
