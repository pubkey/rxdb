process.env['NODE_ENV'] = 'es5';

console.log('# transpiling.. (this takes some time on first run)');
require('events').EventEmitter.defaultMaxListeners = 0;

/**
 * runs the babel-transpile
 * remembers mtime of files and only transpiles the changed ones
 */
const nconf = require('nconf');
const path = require('path');
const fs = require('fs');
const os = require('os');
const walkSync = require('walk-sync');
const shell = require('shelljs');
const existsFile = require('exists-file');
const basePath = path.join(__dirname, '..');

const confLocation = path.join(basePath, '.transpile_state.json');
const cpuCount = os.cpus().length;

const DEBUG = false;

/**
 * key->value | src -> compiled
 */
const transpileFolders = {
    'src': 'dist/lib',
    'test': 'test_tmp'
};

nconf.argv()
    .env()
    .file({
        file: confLocation
    });

async function transpileFile(srcLocations, outDir) {
    DEBUG && console.log('transpile: ' + srcLocations.join(', '));
    // ensure folder exists
    const folder = path.join(outDir);
    if (!fs.existsSync(folder)) {
        shell.mkdir('-p', folder);
    }

    // const outFilePath = 
    // await del.promise([outDir]);
    const cmd = 'babel ' +
        srcLocations.join(' ') +
        ' --source-maps' +
        ' --extensions ".ts,.js"' +
        ' --out-dir ' +
        outDir;

    DEBUG && console.dir(cmd);

    const execRes = shell.exec(cmd, {
        async: true
    });
    await new Promise(res => execRes.on('exit', res));

    const exitCode = execRes.exitCode;
    if (exitCode !== 0) {
        console.error('transpiling failed with cmd: ' + cmd);
        process.exit(1);
    }

    if (DEBUG) {
        console.log('transpiled files: ' + srcLocations.join(', '));
    }

    return;
}

async function getFiles() {
    const files = [];
    await Promise.all(
        Object.entries(transpileFolders)
            .map(entry => entry.map(folder => path.join(basePath, folder)))
            .map(entry => {
                const srcFolder = entry[0];
                const toFolder = entry[1];
                return walkSync.entries(srcFolder)
                    .filter(entry => !entry.isDirectory())
                    .filter(entry => entry.relativePath.endsWith('.js') || entry.relativePath.endsWith('.ts'))
                    .filter(entry => !entry.relativePath.includes('/node_modules/'))
                    .map(fileEntry => {
                        // ensure goal-file-ending is .js
                        const relativePathSplit = fileEntry.relativePath.split('.');
                        relativePathSplit.pop();
                        relativePathSplit.push('js');

                        fileEntry.goalFolder = toFolder;
                        const goalPath = path.join(toFolder, relativePathSplit.join('.'));
                        const fullPath = path.join(fileEntry.basePath, fileEntry.relativePath);

                        const file = {
                            fullPath,
                            relativePath: fileEntry.relativePath,
                            basePath: fileEntry.basePath,
                            mtime: fileEntry.mtime,
                            goalFolder: path.dirname(goalPath),
                            goalPath: goalPath,
                        };

                        const lastTime = parseInt(nconf.get(fileEntry.fullPath), 10);
                        if (
                            lastTime !== fileEntry.mtime ||
                            !existsFile.sync(goalPath)
                        ) {
                            files.push(file);
                        }
                    });
            })
    );

    const filesByGoalFolder = {};
    files.forEach(file => {
        if (!filesByGoalFolder[file.goalFolder]) {
            filesByGoalFolder[file.goalFolder] = [];
        }
        filesByGoalFolder[file.goalFolder].push(file);
    });

    DEBUG && console.dir(filesByGoalFolder);

    return filesByGoalFolder;
}

async function run() {
    const files = await getFiles();


    await Promise.all(
        Object.values(files).map(async (filesWithSameGoalFolder) => {
            await transpileFile(
                filesWithSameGoalFolder.map(file => path.join(file.basePath, file.relativePath)),
                filesWithSameGoalFolder[0].goalFolder
            );
            filesWithSameGoalFolder.forEach(file => nconf.set(file.fullPath, file.mtime));
        })
    );

    nconf.save(function () {
        DEBUG && console.log('conf saved');
        console.log('# transpiling DONE (' + cpuCount + ' CPUs)');
    });
}
run();

