const remote = require('@electron/remote/main');
const electron = require('electron');
const database = require('./database');

remote.initialize();

const app = electron.app;
const BrowserWindow = electron.BrowserWindow;

const windows = [];

global.db; // define the global db object

function createWindow() {
    const width = 300;
    const height = 600;
    const w = new BrowserWindow({
        width,
        height,
        webPreferences: {
            contextIsolation: false,
            nodeIntegration: true,
        }
    });

    remote.enable(w.webContents);

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

    global.db = db;

    // show heroes table in console
    db.heroes.find().sort('name').$.subscribe(heroDocs => {
        console.log('### got heroes(' + heroDocs.length + '):');
        heroDocs.forEach(doc => console.log(
            doc.name + '  |  ' + doc.color
        ));
    });

    createWindow();
    // FIXME: if remove the next line, replication between windows will not work
    // await new Promise(resolve => setTimeout(resolve, 2000));
    createWindow();
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin')
        app.quit();
});
