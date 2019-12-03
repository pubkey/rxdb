/**
 * @preinstall
 * this script ensures all pouchdb-dependencies
 *  have the same version as pouchdb ins the root-folder
 */
const fs = require('fs');
const path = require('path');
const parentPackage = require('../../../package.json');
const pouchVersion = parentPackage.dependencies['pouchdb-core'];
const ownPath = path.join(__dirname, '../package.json');
const ownPackage = require(ownPath);
console.log('pouchdb version: ' + pouchVersion);
Object.keys(ownPackage.dependencies)
    .filter(dep => dep.startsWith('pouchdb-adapter-'))
    .forEach(dep => {
        ownPackage.dependencies[dep] = pouchVersion;
    });
const newJson = JSON.stringify(ownPackage, null, 2);
fs.writeFileSync(ownPath, newJson, {
    encoding: 'utf8',
    flag: 'w'
});
console.log('ensure-equal-version.js: done');
