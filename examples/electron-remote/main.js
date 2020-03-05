const electron = require('electron');
require('electron-window-manager');
const path = require('path');
const url = require('url');
const database = require('./database');

const app = electron.app;
const BrowserWindow = electron.BrowserWindow;

const windows = [];

global.db; // define the global db object

function createWindow(dbSuffix) {
    const width = 300;
    const height = 600;
    const w = new BrowserWindow({
        width,
        height,
        webPreferences: {
            nodeIntegration: true
        }
    });

    w.loadURL(url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file:',
        slashes: true
    }));

    const x = windows.length * width;
    const y = 0;
    w.setPosition(x, y);
    w.custom = {
        dbSuffix
    };
    windows.push(w);
}


app.on('ready', async function() {
    const dbSuffix = new Date().getTime(); // we add a random timestamp in dev-mode to reset the database on each start

    global.db = await database.getDatabase(
        'heroesdb' + dbSuffix,
        'memory'
    );

    // show heroes table in console
    global.db.heroes.find().sort('name').$.subscribe(heroDocs => {
        console.log('### got heroes(' + heroDocs.length + '):');
        heroDocs.forEach(doc => console.log(
            doc.name + '  |  ' + doc.color
        ));
    });

    createWindow(dbSuffix);
    createWindow(dbSuffix);
});

app.on('window-all-closed', function() {
    if (process.platform !== 'darwin')
        app.quit();
});
