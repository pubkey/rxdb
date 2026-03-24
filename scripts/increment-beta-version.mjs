/**
 * Reads the current version from package.json,
 * increments the beta version number, and outputs the new version.
 * 
 * For example: 17.0.0-beta.24 -> 17.0.0-beta.25
 * 
 * If the current version is not a beta version,
 * it exits with an error.
 */
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootPath = path.join(__dirname, '../');

const packageJson = JSON.parse(
    fs.readFileSync(path.join(rootPath, 'package.json'), 'utf-8')
);

const currentVersion = packageJson.version;
console.log('current version: ' + currentVersion);

const betaRegex = /^(.+)-beta\.(\d+)$/;
const match = currentVersion.match(betaRegex);

if (!match) {
    console.error('ERROR: Current version "' + currentVersion + '" is not a beta version.');
    process.exit(1);
}

const baseVersion = match[1];
const betaNumber = parseInt(match[2], 10);
const newBetaNumber = betaNumber + 1;
const newVersion = baseVersion + '-beta.' + newBetaNumber;

console.log('new version: ' + newVersion);

/**
 * Write to GITHUB_OUTPUT if running in CI,
 * so the workflow can use the version in subsequent steps.
 */
if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, 'version=' + newVersion + '\n');
}
