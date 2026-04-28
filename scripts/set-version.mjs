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

    /**
     * Fetches changelog entries from a GitHub repo's orga/changelog/ directory
     * (one-change-per-file convention) and appends them under a heading.
     */
    async function appendExternalChangelog(repo, heading, token) {
        try {
            const headers = {
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'rxdb-release-script'
            };
            if (token) {
                headers['Authorization'] = `token ${token}`;
            }
            const dirUrl = `https://api.github.com/repos/pubkey/${repo}/contents/orga/changelog`;
            const dirResponse = await fetch(dirUrl, { headers });
            if (!dirResponse.ok) {
                console.warn(`Could not fetch ${repo} changelog directory, status: ${dirResponse.status}`);
                return;
            }
            const dirEntries = await dirResponse.json();
            const files = dirEntries
                .filter(e => e.type === 'file' && e.name.endsWith('.md') && e.name !== 'README.md')
                .sort((a, b) => a.name.localeCompare(b.name));
            const rows = [];
            for (const entry of files) {
                const fileResponse = await fetch(entry.download_url, { headers });
                if (fileResponse.ok) {
                    const content = await fileResponse.text();
                    const lines = content.split('\n').filter(l => l.trim().length > 0);
                    rows.push(...lines);
                }
            }
            if (rows.length > 0) {
                newRows.push(heading);
                newRows.push(...rows);
                newRows.push('');
            }
        } catch (e) {
            console.warn(`Could not fetch ${repo} changelog: ${e.message}`);
        }
    }

    const rxdbServerToken = process.env.RXDB_SERVER_TOKEN;
    if (!rxdbServerToken) {
        throw new Error('RXDB_SERVER_TOKEN is not set');
    }
    await appendExternalChangelog('rxdb-server', '#### RxDB Server', rxdbServerToken);
    const rxdbPremiumToken = process.env.RXDB_PREMIUM_FETCH_CHANGELOG;
    if (!rxdbPremiumToken) {
        throw new Error('RXDB_PREMIUM_FETCH_CHANGELOG is not set');
    }
    await appendExternalChangelog('rxdb-premium-dev', '#### RxDB Premium', rxdbPremiumToken);

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
