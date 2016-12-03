const electron = require('electron');
const windowManager = require('electron-window-manager');
const path = require('path');
const url = require('url');

const app = electron.app;
const BrowserWindow = electron.BrowserWindow;

const windows = [];
function createWindow () {
  const width = 300;
  const height = 600;
  let w = new BrowserWindow({width, height});

  w.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }));

  const x = windows.length*width;
  const y = 0;
  w.setPosition(x, y);
  windows.push(w);
}

app.on('ready', function(){
  createWindow();
  createWindow();
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit()
  }
});