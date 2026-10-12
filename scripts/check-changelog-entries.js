const fs = require('fs');
const path = require('path');

const changelogDir = path.join(__dirname, '../orga/changelog');
const changelogFile = path.join(__dirname, '../CHANGELOG.md');

const NEWEST_START = '<!-- CHANGELOG NEWEST -->';
const NEWEST_END = '<!-- /CHANGELOG NEWEST -->';

let hasError = false;

/**
 * A changelog entry is a markdown list item, so it has to start with '- '.
 * Lines that start with whitespace continue the entry above them and are
 * therefore allowed. Everything else would be merged into CHANGELOG.md as
 * a line that renders inside the previous bullet instead of as its own entry.
 */
function checkLines(filePath, lines, lineOffset) {
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim() === '') {
            continue;
        }
        if (line.startsWith('- ') || /^\s/.test(line)) {
            continue;
        }
        console.error(`Error: changelog entry does not start with "- " in ${filePath}:${i + 1 + lineOffset}`);
        console.error(`> ${line}`);
        console.error('-'.repeat(100));
        hasError = true;
    }
}

function checkEntryFiles() {
    if (!fs.existsSync(changelogDir)) {
        return;
    }
    const files = fs.readdirSync(changelogDir)
        .filter(file => file.endsWith('.md'))
        .filter(file => file !== 'README.md')
        .sort();
    for (const file of files) {
        const fullPath = path.join(changelogDir, file);
        const content = fs.readFileSync(fullPath, 'utf-8');
        checkLines(fullPath, content.split('\n'), 0);
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
        console.error(`Error: ${changelogFile} is missing the ${NEWEST_START} / ${NEWEST_END} markers.`);
        hasError = true;
        return;
    }
    const block = lines.slice(start + 1, end).filter(line => !line.trim().startsWith('<!--'));
    checkLines(changelogFile, block, start + 1);
}

console.log('Checking changelog entries start with "- "...');

checkEntryFiles();
checkNewestBlock();

if (hasError) {
    console.error('\nEvery changelog entry has to be a markdown list item starting with "- ".');
    console.error('See orga/changelog/README.md');
    process.exit(1);
} else {
    console.log('Success: All changelog entries start with "- ".');
    process.exit(0);
}
