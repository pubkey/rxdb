/**
 * Set the version before a release.
 * The new version number is passed via args
 */


import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

import fs from 'fs';

const args = process.argv;
const version = args[2];
console.log('new version: ' + version);
const isBeta = version.includes('beta');
console.log('isBeta: ' + isBeta);


const rootPath = path.join(
    __dirname,
    '../'
);

async function run() {

    // update version in package.json
    const packageJson = require(
        path.join(rootPath, 'package.json')
    );
    packageJson.version = version;
    await fs.promises.writeFile(
        path.join(rootPath, 'package.json'),
        JSON.stringify(packageJson, null, 2)
    );


    // update changelog
    const changelogFlagStart = '<!-- CHANGELOG NEWEST -->';
    const changelogFlagEnd = '<!-- /CHANGELOG NEWEST -->';
    const changelogReleaseBelowFlag = '<!-- RELEASE BELOW -->';

    const changelogContent = await fs.promises.readFile(
        path.join(rootPath, 'CHANGELOG.md'),
        'utf-8'
    );
    let changelogRows = changelogContent.split('\n');

    if (
        !changelogRows.includes(changelogFlagStart) ||
        !changelogRows.includes(changelogFlagEnd) ||
        !changelogRows.includes(changelogReleaseBelowFlag)
    ) {
        throw new Error('changelog flag missing');
    }
    const indexReleaseBelow = changelogRows.indexOf(changelogReleaseBelowFlag);

    const indexStart = changelogRows.indexOf(changelogFlagStart);
    const indexEnd = changelogRows.indexOf(changelogFlagEnd);

    let newRows = changelogRows.slice(indexStart + 1, indexEnd);
    newRows = newRows
        .filter(row => !row.startsWith('<!-- '))
        .filter(row => !row.startsWith('### '));
    newRows.push('');


    /**
     * Write to release-body.md so the github action
     * knows what to use as release body
     */
    const releaseBodyRows = newRows.slice(0).concat([
        '',
        '',
        '**NOTICE:** An overview about all releases can be found [at the changelog](https://github.com/pubkey/rxdb/blob/master/CHANGELOG.md)'
    ]);
    await fs.promises.writeFile(
        path.join(rootPath, 'release-body.md'),
        releaseBodyRows.join('\n'),
        'utf-8'
    );

    changelogRows = changelogRows.slice(indexReleaseBelow + 1);

    const date = new Date();
    const month = date.toLocaleString('en', { month: 'long' });
    const day = date.getDate();
    const year = date.getFullYear();
    const newVersionHeader = `### ${version} (${day} ${month} ${year})\n`;


    /**
     * If it is a beta release, the changes must stay inside of the newest-flag
     */
    if (isBeta) {
        changelogRows.unshift(changelogReleaseBelowFlag);
        changelogRows.unshift('');
        changelogRows.unshift(changelogFlagEnd);
        changelogRows.unshift('');
        changelogRows.unshift('');
        changelogRows = newRows.concat(changelogRows);
        changelogRows.unshift('');
        changelogRows.unshift('');
        changelogRows.unshift(newVersionHeader);
        changelogRows.unshift('');
        changelogRows.unshift('');
        changelogRows.unshift('<!-- ADD new changes here! -->\n');
        changelogRows.unshift('');
        changelogRows.unshift(changelogFlagStart);
        changelogRows.unshift('');
    } else {
        changelogRows = newRows.concat(changelogRows);
        changelogRows.unshift(newVersionHeader);
        changelogRows.unshift('');
        changelogRows.unshift(changelogReleaseBelowFlag);
        changelogRows.unshift('');
        changelogRows.unshift(changelogFlagEnd);
        changelogRows.unshift('');
        changelogRows.unshift('<!-- ADD new changes here! -->\n');
        changelogRows.unshift('');
        changelogRows.unshift(changelogFlagStart);
    }

    changelogRows.unshift('# RxDB Changelog\n');
    changelogRows.unshift('');

    // remove unnecessary linebreaks
    let newChangelogContent = changelogRows.join('\n');
    newChangelogContent = newChangelogContent.replace(/### /g, '\n### ');
    newChangelogContent = newChangelogContent.replace(/\n{3,}/g, '\n\n');
    console.log(newChangelogContent);

    await fs.promises.writeFile(
        path.join(rootPath, 'CHANGELOG.md'),
        newChangelogContent,
        'utf-8'
    );
}

run();
