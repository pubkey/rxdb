const { ipcRenderer } = require('electron');

window.getDBSuffix = () => ipcRenderer.invoke('getDBSuffix');
