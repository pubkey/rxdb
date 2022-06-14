const electron = require('electron');
const path = require('path');
const { addRxPlugin } = require('rxdb');
const { RxDBServerPlugin } = require('rxdb/plugins/server');
const database = require('./database');

addRxPlugin(RxDBServerPlugin);

const app = electron.app;
const BrowserWindow = electron.BrowserWindow;

const windows = [];

function createWindow() {
    const width = 300;
    const height = 600;
    const w = new BrowserWindow({
        width,
        height,
        webPreferences: {
            contextIsolation: false,
            nodeIntegration: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    w.loadFile('index.html');

    const x = windows.length * width;
    const y = 0;
    w.setPosition(x, y);
    windows.push(w);
}


app.on('ready', async function () {
    const dbSuffix = new Date().getTime(); // we add a random timestamp in dev-mode to reset the database on each start

    electron.ipcMain.handle('getDBSuffix', () => dbSuffix);

    const db = await database.createDatabase(
        'heroesdb' + dbSuffix,
        'memory'
    );

    /**
     * spawn a server
     * which is used as sync-goal by page.js
     */
    console.log('start server');
    await db.server({
        path: '/db',
        port: 10102,
        cors: true
    });
    console.log('started server');

    // show heroes table in console
    db.heroes.find().sort('name').$.subscribe(heroDocs => {
        console.log('### got heroes(' + heroDocs.length + '):');
        heroDocs.forEach(doc => console.log(
            doc.name + '  |  ' + doc.color
        ));
    });

    createWindow();
    createWindow();
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin')
        app.quit();
});
