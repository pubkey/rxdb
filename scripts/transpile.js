/**
 * runs the babel-transpile
 * remembers mtime of files and only transpiles the changed ones
 */
const nconf = require('nconf');
const path = require('path');
const fs = require('fs');
const walkSync = require('walk-sync');
const shell = require('shelljs');
const del = require('delete');
const basePath = path.join(__dirname, '..');

const confLocation = path.join(basePath, '.transpile_state.json');

const DEBUG = false;

/**
 * key->value | src -> compiled
 */
const transpileFolders = {
    'src': 'dist/lib',
    'test/helper': 'test_tmp/helper',
    'test/unit': 'test_tmp/unit'
};

nconf.argv()
    .env()
    .file({
        file: confLocation
    });



async function transpileFile(srcLocation, goalLocation) {

    // ensure folder exists
    const folder = path.join(goalLocation, '..');
    if (!fs.existsSync(folder)) shell.mkdir('-p', folder);

    await del.promise([goalLocation]);
    const cmd = 'node node_modules/babel-cli/bin/babel.js ' + srcLocation + ' --out-file ' + goalLocation;
    DEBUG && console.dir(cmd);
    if (shell.exec(cmd).code !== 0)
        throw new Error('transpiling ' + srcLocation + ' failed');
    console.log('transpiled: ' + srcLocation);


    return;
}


const files = Object.entries(transpileFolders)
    .map(entry => entry.map(folder => path.join(basePath, folder)))
    .map(entry => {
        const srcFolder = entry[0];
        const toFolder = entry[1];
        return fileEntries = walkSync.entries(srcFolder)
            .map(fileEntry => {
                fileEntry.goalPath = path.join(toFolder, fileEntry.relativePath);
                return fileEntry;
            });
    })
    .reduce((pre, cur) => pre.concat(cur), [])
    .filter(entry => !entry.isDirectory())
    .filter(entry => entry.relativePath.endsWith('.js'))
    .map(entry => {
        entry.fullPath = path.join(entry.basePath, entry.relativePath);
        entry.lastTime = nconf.get(entry.fullPath);
        return entry;
    })
    .filter(entry => entry.lastTime != entry.mtime);

DEBUG && console.dir(files);

let test = files;
//test = [files[0]];



Promise.all(files
        .map(fileEntry => {
            return transpileFile(
                path.join(fileEntry.basePath, fileEntry.relativePath),
                fileEntry.goalPath
            ).then(() => {
                nconf.set(fileEntry.fullPath, fileEntry.mtime);
            });
        }))
    .then(() => {
        nconf.save(function(err) {
            DEBUG && console.log('conf saved');
            console.log('transpile.js: DONE');
        });
    });
