/**
 * this plugin adds the json export/import capabilities to RxDB
 */
import * as util from '../util';
import RxQuery from '../rx-query';

const dumpRxDatabase = async function(decrypted = false, collections = null) {
    const json = {
        name: this.name,
        instanceToken: this.token,
        encrypted: false,
        passwordHash: null,
        collections: []
    };

    if (this.password) {
        json.passwordHash = util.hash(this.password);
        if (decrypted) json.encrypted = false;
        else json.encrypted = true;
    }

    const useCollections = Object.keys(this.collections)
        .filter(colName => !collections || collections.includes(colName))
        .filter(colName => colName.charAt(0) != '_')
        .map(colName => this.collections[colName]);

    json.collections = await Promise.all(
        useCollections
        .map(col => col.dump(decrypted))
    );
    return json;
};

const importDumpRxDatabase = async function(dump) {
    return Promise.all(
        dump.collections
        .filter(colDump => this.collections[colDump.name])
        .map(colDump => this.collections[colDump.name].importDump(colDump))
    );
};

const dumpRxCollection = async function(decrypted = false) {
    const encrypted = !decrypted;

    const json = {
        name: this.name,
        schemaHash: this.schema.hash,
        encrypted: false,
        passwordHash: null,
        docs: []
    };

    if (this.database.password && encrypted) {
        json.passwordHash = util.hash(this.database.password);
        json.encrypted = true;
    }

    const query = RxQuery.create('find', {}, this);
    const docs = await this._pouchFind(query, null, encrypted);
    json.docs = docs.map(docData => {
        delete docData._rev;
        return docData;
    });
    return json;
};

const importDumpRxCollection = async function(exportedJSON) {
    // check schemaHash
    if (exportedJSON.schemaHash != this.schema.hash)
        throw new Error('the imported json relies on a different schema');

    // check if passwordHash matches own
    if (
        exportedJSON.encrypted &&
        exportedJSON.passwordHash != util.hash(this.database.password)
    ) throw new Error('json.passwordHash does not match the own');


    const importFns = exportedJSON.docs
        // decrypt
        .map(doc => this._crypter.decrypt(doc))
        // validate schema
        .map(doc => this.schema.validate(doc))
        // import
        .map(doc => this._pouchPut(doc));
    return Promise.all(importFns);
};

export const rxdb = true;
export const prototypes = {
    RxDatabase: proto => {
        proto.dump = dumpRxDatabase;
        proto.importDump = importDumpRxDatabase;
    },
    RxCollection: proto => {
        proto.dump = dumpRxCollection;
        proto.importDump = importDumpRxCollection;
    }
};

export const overwritable = {};

export default {
    rxdb,
    prototypes,
    overwritable
};
