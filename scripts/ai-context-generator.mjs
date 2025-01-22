/**
 * Generates a ai-context.txt file
 * to pass into AI models so they know everything about RxDB
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PAGE_DELEMITER_START = '\n\n\n\n\n-------------------- PAGE START -------------------------\n';
const PAGE_DELEMITER_END = '\n\n-------------------- PAGE END -------------------------\n\n\n\n\n';
const OUTPUT_FILE = '../ai-context.txt';

const fileExtension = '.md';
const folder = '../docs-src/docs';
const additionalFiles = [
    '../README.md',
    '../CHANGELOG.md'
];

const ignoreFiles = [
    'rx-storage-pouchdb.md',
    'adapters.md',
    'rx-storage-lokijs.md'
];


async function run() {

    let files = await fs.promises.readdir(folder, { recursive: true });
    files = files.map(file => path.join(__dirname, folder, file));
    additionalFiles.forEach(file => files.push(path.join(__dirname, file)));


    console.log(JSON.stringify(files, null, 4));

    let output = 'CONTEXT: \n\n\n\n';
    await Promise.all(
        files.map(async (file) => {

            const isInIgnoreList = ignoreFiles.find(ign => file.includes(ign));
            if (isInIgnoreList || !file.endsWith(fileExtension)) {
                return;
            }
            console.log('f: ' + file);
            const content = await fs.promises.readFile(file, 'utf-8').catch(err => {
                console.error('ERROR READING FILE ' + file);
                throw err;
            });
            output += PAGE_DELEMITER_START + 'FILE: ' + file + '\n\n' + content + PAGE_DELEMITER_END;
        })
    );

    console.log(output);


    await fs.promises.writeFile(OUTPUT_FILE, output, 'utf-8');

}

await run();
