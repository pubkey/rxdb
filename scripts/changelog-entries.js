/**
 * Helpers to read and render the changelog entry files
 * of the orga/changelog/ folder.
 * See orga/changelog/README.md
 */
const fs = require('fs');
const path = require('path');

const changelogDir = path.join(__dirname, '../orga/changelog');
const changelogSchemaPath = path.join(changelogDir, 'schema.json');
const NON_ENTRY_FILES = ['README.md', 'schema.json'];

function isChangelogEntryFile(fileName) {
    return fileName.endsWith('.json') && !NON_ENTRY_FILES.includes(fileName);
}

function getChangelogEntryFiles() {
    return fs.readdirSync(changelogDir)
        .filter(isChangelogEntryFile)
        .sort();
}

/**
 * Renders one entry as a markdown list item.
 * The links are appended behind the text.
 */
function changelogEntryToMarkdown(entry) {
    const links = entry.links.map(link => `[${link.linkText}](${link.url})`);
    return '- ' + [entry.text.trim(), ...links].join(' ');
}

/**
 * Sorts entries so that the ones with the highest priority come first.
 * Entries with the same priority keep their order.
 */
function sortChangelogEntries(entries) {
    return entries.slice(0).sort((a, b) => b.priority - a.priority);
}

module.exports = {
    changelogDir,
    changelogSchemaPath,
    isChangelogEntryFile,
    getChangelogEntryFiles,
    changelogEntryToMarkdown,
    sortChangelogEntries
};
