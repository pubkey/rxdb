const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');
const {
    changelogDir,
    changelogSchemaPath,
    getChangelogEntryFiles
} = require('./changelog-entries.js');

const changelogFile = path.join(__dirname, '../CHANGELOG.md');

const NEWEST_START = '<!-- CHANGELOG NEWEST -->';
const NEWEST_END = '<!-- /CHANGELOG NEWEST -->';

let hasError = false;

function logError(message, details) {
    console.error('Error: ' + message);
    if (details) {
        console.error(details);
    }
    console.error('-'.repeat(100));
    hasError = true;
}

/**
 * Every file in orga/changelog/ besides the README and the schema
 * must be a JSON entry that is valid against orga/changelog/schema.json.
 */
function checkEntryFiles() {
    if (!fs.existsSync(changelogDir)) {
        return;
    }
    const schema = JSON.parse(fs.readFileSync(changelogSchemaPath, 'utf-8'));
    const ajv = new Ajv({ allErrors: true });
    const validate = ajv.compile(schema);

    const entryFiles = getChangelogEntryFiles();
    fs.readdirSync(changelogDir)
        .filter(file => !entryFiles.includes(file) && file !== 'README.md' && file !== 'schema.json')
        .forEach(file => logError(
            `changelog entry ${path.join(changelogDir, file)} is not a .json file`
        ));

    for (const file of entryFiles) {
        const fullPath = path.join(changelogDir, file);
        let entry;
        try {
            entry = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
        } catch (err) {
            logError(`changelog entry ${fullPath} is not valid JSON`, err.message);
            continue;
        }
        if (!validate(entry)) {
            logError(
                `changelog entry ${fullPath} does not match the schema`,
                ajv.errorsText(validate.errors, { separator: '\n', dataVar: 'entry' })
            );
        }
    }
}

/**
 * The unreleased block of CHANGELOG.md is checked as well because entries
 * are sometimes written there by hand instead of into orga/changelog/.
 * Everything below the released versions is left alone, it contains
 * historical sub-headings like 'Bugfixes:' that predate this format.
 */
function checkNewestBlock() {
    const lines = fs.readFileSync(changelogFile, 'utf-8').split('\n');
    const start = lines.indexOf(NEWEST_START);
    const end = lines.indexOf(NEWEST_END);
    if (start === -1 || end === -1) {
        logError(`${changelogFile} is missing the ${NEWEST_START} / ${NEWEST_END} markers.`);
        return;
    }
    for (let i = start + 1; i < end; i++) {
        const line = lines[i];
        if (
            line.trim() === '' ||
            line.trim().startsWith('<!--') ||
            line.startsWith('- ') ||
            /^\s/.test(line)
        ) {
            continue;
        }
        logError(
            `changelog entry does not start with "- " in ${changelogFile}:${i + 1}`,
            `> ${line}`
        );
    }
}

console.log('Checking changelog entries...');

checkEntryFiles();
checkNewestBlock();

if (hasError) {
    console.error('\nEvery changelog entry has to be a JSON file that matches orga/changelog/schema.json.');
    console.error('See orga/changelog/README.md');
    process.exit(1);
} else {
    console.log('Success: All changelog entries are valid.');
    process.exit(0);
}
