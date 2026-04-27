/**
 * Set the version before a release.
 * The new version number is passed via args
 */


import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    const packageJson = JSON.parse(
        await fs.promises.readFile(
            path.join(rootPath, 'package.json')
        )
    );
    packageJson.version = version;
    await fs.promises.writeFile(
        path.join(rootPath, 'package.json'),
        JSON.stringify(packageJson, null, 2)
    );


    // collect changelog entries from orga/changelog/ files
    const changelogDir = path.join(rootPath, 'orga', 'changelog');
    const changelogFiles = (await fs.promises.readdir(changelogDir))
        .filter(f => f.endsWith('.md') && f !== 'README.md')
        .sort();
    const newRows = [];
    for (const file of changelogFiles) {
        const content = await fs.promises.readFile(
            path.join(changelogDir, file),
            'utf-8'
        );
        const lines = content.split('\n').filter(row => row.trim().length > 0);
        newRows.push(...lines);
    }
    newRows.push('');

    // collect changelog entries from rxdb-server
    try {
        const rxdbServerToken = process.env.RXDB_SERVER_TOKEN || '';
        const rxdbServerChangelogUrl = 'https://api.github.com/repos/pubkey/rxdb-server/contents/CHANGELOG.md';
        const fetchHeaders = {
            'Accept': 'application/vnd.github.v3.raw',
            'User-Agent': 'rxdb-release-script'
        };
        if (rxdbServerToken) {
            fetchHeaders['Authorization'] = `token ${rxdbServerToken}`;
        }
        const response = await fetch(rxdbServerChangelogUrl, { headers: fetchHeaders });
        if (response.ok) {
            const serverChangelog = await response.text();
            const serverLines = serverChangelog.split('\n');
            const unreleasedIdx = serverLines.findIndex(l => l.trim().startsWith('## Unreleased'));
            if (unreleasedIdx !== -1) {
                const nextSectionIdx = serverLines.findIndex((l, i) => i > unreleasedIdx && l.startsWith('## '));
                const endIdx = nextSectionIdx === -1 ? serverLines.length : nextSectionIdx;
                const serverChanges = serverLines
                    .slice(unreleasedIdx + 1, endIdx)
                    .filter(l => l.trim().startsWith('-'));
                if (serverChanges.length > 0) {
                    newRows.push('#### RxDB Server');
                    newRows.push(...serverChanges);
                    newRows.push('');
                }
            }
        } else {
            console.warn('Could not fetch rxdb-server changelog, status: ' + response.status);
        }
    } catch (e) {
        console.warn('Could not fetch rxdb-server changelog: ' + e.message);
    }

    // update changelog
    const changelogFlagStart = '<!-- CHANGELOG NEWEST -->';
    const changelogFlagEnd = '<!-- /CHANGELOG NEWEST -->';
    const changelogReleaseBelowFlag = '<!-- RELEASE BELOW -->';

    const changelogContent = await fs.promises.readFile(
        path.join(rootPath, 'CHANGELOG.md'),
        'utf-8'
    );
    let changelogRows = changelogContent.split('\n');

    if (!changelogRows.includes(changelogReleaseBelowFlag)) {
        throw new Error('changelog flag missing');
    }
    const indexReleaseBelow = changelogRows.indexOf(changelogReleaseBelowFlag);


    /**
     * Write to release-body.md so the github action
     * knows what to use as release body
     */
    let releaseBodyRows = [
        // add this line for a backlink and to have a big image appear in peoples github newsfeed.
        `<p align="center">
            <a href="https://rxdb.info/">
                <img src="https://rxdb.info/files/logo/rxdb_javascript_database.svg" width="380px" alt="JavaScript Database" />
            </a>
        </p>`,
        '',
    ];
    releaseBodyRows.push(newRows.slice(0));
    releaseBodyRows.push([
        '',
        '',
        '**NOTICE:** An overview about all releases can be found [at the changelog](https://github.com/pubkey/rxdb/blob/master/CHANGELOG.md)'
    ]);
    releaseBodyRows.push([
        '### Join RxDB:',
        '- 💬 [Join the RxDB Chat](https://rxdb.info/chat)',
        '- ⭐ [Star the RxDB Repo](https://github.com/pubkey/rxdb)',
        '- 📰 [Subscribe to the newsletter](https://rxdb.info/newsletter)',
        '- 🐦 [Follow at Twitter](https://twitter.com/intent/user?screen_name=rxdbjs)',
        '- 🔗 [Follow at LinkedIn](https://www.linkedin.com/company/rxdb)'
    ]);
    releaseBodyRows = releaseBodyRows.flat();

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
        changelogRows.unshift('<!-- ADD new changes to orga/changelog/ as one file per change -->\n');
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
        changelogRows.unshift('<!-- ADD new changes to orga/changelog/ as one file per change -->\n');
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

    // delete the changelog entry files after merging
    for (const file of changelogFiles) {
        await fs.promises.unlink(path.join(changelogDir, file));
    }
}

run();
