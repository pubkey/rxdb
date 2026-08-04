process.env['NODE_ENV'] = 'es5';

console.log('# transpiling.. (this takes some time on first run)');
import events from 'events';
events.EventEmitter.defaultMaxListeners = 0;

/**
 * runs the babel-transpile
 * remembers mtime of files and only transpiles the changed ones
 */
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { spawn } from 'node:child_process';
import existsFile from 'exists-file';
import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const basePath = path.join(__dirname, '..');

const confLocation = path.join(basePath, '.transpile_state.json');
const cpuCount = os.cpus().length;

const DEBUG = false;

/**
 * key->value | src -> compiled
 */
const TRANSPILE_FOLDERS = [
    {
        source: 'src',
        goals: {
            es5: 'dist/cjs',
            es6: 'dist/esm'
        }
    },
    {
        source: 'test',
        goals: {
            es6: 'test_tmp'
        }
    }
];

/**
 * The state maps the absolute path of each source file
 * to the mtime that file had when it was transpiled the last time.
 */
function readState() {
    try {
        return JSON.parse(fs.readFileSync(confLocation, 'utf-8'));
    } catch (err) {
        // no state file yet or a broken one, transpile everything
        return {};
    }
}
function writeState(state) {
    fs.writeFileSync(confLocation, JSON.stringify(state, null, 2), 'utf-8');
}

async function runCommand(cmd) {
    if (DEBUG) {
        console.dir(cmd);
    }
    const child = spawn(cmd, {
        shell: true,
        stdio: 'inherit'
    });
    const exitCode = await new Promise(res => child.on('exit', res));
    if (exitCode !== 0) {
        console.error('transpiling failed with cmd: ' + cmd);
        process.exit(1);
    }
}

async function transpileFile(
    srcLocations,
    outDir,
    env
) {
    if (DEBUG) {
        console.log('transpile: ' + srcLocations.join(', '));
    }
    // ensure folder exists
    const folder = path.join(outDir);
    await fs.promises.mkdir(
        folder,
        {
            recursive: true,
        }
    ).catch(err => {
        console.error('# transpile.mjs: could not create directory: ' + folder, err);
    });

    const cmd = 'cross-env NODE_ENV=' + env +
        ' babel ' +
        srcLocations.join(' ') +
        ' --source-maps' +
        ' --extensions ".ts,.tsx,.js"' +
        ' --out-dir ' +
        outDir;

    await runCommand(cmd);

    if (DEBUG) {
        console.log('transpiled files: ' + srcLocations.join(', '));
    }

    return;
}

/**
 * Returns all files of the given folder, recursively,
 * together with the mtime of each file.
 */
function walkFolder(folder) {
    return fs.readdirSync(folder, { recursive: true, withFileTypes: true })
        .filter(entry => entry.isFile())
        .map(entry => {
            const fullPath = path.join(entry.parentPath ? entry.parentPath : entry.path, entry.name);
            return {
                fullPath,
                relativePath: path.relative(folder, fullPath),
                mtime: Math.floor(fs.statSync(fullPath).mtimeMs)
            };
        });
}

function getFiles(state) {
    const files = [];
    TRANSPILE_FOLDERS
        // make all file paths absolute
        .map(transpileFolder => {
            const goals = {};
            Object.entries(transpileFolder.goals).forEach(([env, goalFolder]) => {
                goals[env] = path.join(basePath, goalFolder);
            });
            return {
                source: path.join(basePath, transpileFolder.source),
                goals
            };
        })
        .forEach(transpileFolder => {
            walkFolder(transpileFolder.source)
                .filter(entry => entry.relativePath.endsWith('.js') || entry.relativePath.endsWith('.ts') || entry.relativePath.endsWith('.tsx'))
                .filter(entry => !entry.relativePath.split(path.sep).includes('node_modules'))
                .forEach(fileEntry => {
                    // ensure goal-file-ending is .js
                    const relativePathSplit = fileEntry.relativePath.split('.');
                    relativePathSplit.pop();
                    relativePathSplit.push('js');
                    Object.entries(transpileFolder.goals).forEach(([env, toFolder]) => {
                        const goalPath = path.join(toFolder, relativePathSplit.join('.'));

                        const lastTime = parseInt(state[fileEntry.fullPath], 10);
                        const file = {
                            env,
                            fullPath: fileEntry.fullPath,
                            mtime: fileEntry.mtime,
                            goalFolder: path.dirname(goalPath),
                            goalPath: goalPath,
                        };
                        if (
                            lastTime !== fileEntry.mtime ||
                            !existsFile.sync(goalPath)
                        ) {
                            files.push(file);
                        }
                    });
                });
        });

    const filesByGoalFolder = {};
    files.forEach(file => {
        if (!filesByGoalFolder[file.goalFolder]) {
            filesByGoalFolder[file.goalFolder] = [];
        }
        filesByGoalFolder[file.goalFolder].push(file);
    });

    if (DEBUG) {
        console.dir(filesByGoalFolder);
    }

    return filesByGoalFolder;
}

async function run() {
    const state = readState();
    const files = getFiles(state);

    let totalFiles = 0;
    Object.values(files).forEach(f => {
        totalFiles += f.length;
    });

    if (totalFiles > 30) {
        console.log('# Many files changed (' + totalFiles + '), running full build via npm scripts...');
        await runCommand('concurrently "npm run build:cjs" "npm run build:esm" "npm run build:test"');
        Object.values(files).forEach(filesWithSameGoalFolder => {
            filesWithSameGoalFolder.forEach(file => {
                state[file.fullPath] = file.mtime;
            });
        });
    } else {
        await Promise.all(
            Object.values(files).map(async (filesWithSameGoalFolder) => {

                const byEnv = {};
                filesWithSameGoalFolder.forEach(row => {
                    const env = row.env;
                    if (!byEnv[env]) {
                        byEnv[env] = [];
                    }
                    const ar = byEnv[env];
                    ar.push(row);
                });

                await Promise.all(
                    Object.entries(byEnv)
                        .map(async ([env, innerFiles]) => {
                            await transpileFile(
                                innerFiles.map(file => file.fullPath),
                                innerFiles[0].goalFolder,
                                env
                            );
                            innerFiles.forEach(file => {
                                state[file.fullPath] = file.mtime;
                            });
                        })
                );
            })
        );
    }

    writeState(state);
    if (DEBUG) {
        console.log('conf saved');
    }
    console.log('# transpiling DONE (' + cpuCount + ' CPUs)');
}
run();
