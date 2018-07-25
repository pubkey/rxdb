/**
 * this plugin adds the json export/import capabilities to RxDB
 */
import {
    hash
} from '../util';
import RxQuery from '../rx-query';
import RxError from '../rx-error';
import RxChangeEvent from '../rx-change-event';

/**
 * @return {Promise}
 */
const dumpRxDatabase = function (decrypted = false, collections = null) {
    const json = {
        name: this.name,
        instanceToken: this.token,
        encrypted: false,
        passwordHash: null,
        collections: []
    };

    if (this.password) {
        json.passwordHash = hash(this.password);
        if (decrypted) json.encrypted = false;
        else json.encrypted = true;
    }

    const useCollections = Object.keys(this.collections)
        .filter(colName => !collections || collections.includes(colName))
        .filter(colName => colName.charAt(0) !== '_')
        .map(colName => this.collections[colName]);

    return Promise.all(
        useCollections
            .map(col => col.dump(decrypted))
    ).then(cols => {
        json.collections = cols;
        return json;
    });
};

const importDumpRxDatabase = function (dump) {
    /**
     * collections must be created before the import
     * because we do not know about the other collection-settings here
     */
    const missingCollections = dump.collections
        .filter(col => !this.collections[col.name])
        .map(col => col.name);
    if (missingCollections.length > 0) {
        throw RxError.newRxError('JD1', {
            missingCollections
        });
    }

    return Promise.all(
        dump.collections
            .map(colDump => this.collections[colDump.name].importDump(colDump))
    );
};

const dumpRxCollection = function (decrypted = false) {
    const encrypted = !decrypted;

    const json = {
        name: this.name,
        schemaHash: this.schema.hash,
        encrypted: false,
        passwordHash: null,
        docs: []
    };

    if (this.database.password && encrypted) {
        json.passwordHash = hash(this.database.password);
        json.encrypted = true;
    }

    const query = RxQuery.create('find', {}, this);

    return this._pouchFind(query, null, encrypted)
        .then(docs => {
            json.docs = docs.map(docData => {
                delete docData._rev;
                return docData;
            });
            return json;
        });
};

/**
 * @return {Promise}
 */
const importDumpRxCollection = function (exportedJSON) {
    // check schemaHash
    if (exportedJSON.schemaHash !== this.schema.hash) {
        throw RxError.newRxError('JD2', {
            schemaHash: exportedJSON.schemaHash,
            own: this.schema.hash
        });
    }

    // check if passwordHash matches own
    if (
        exportedJSON.encrypted &&
        exportedJSON.passwordHash !== hash(this.database.password)
    ) {
        throw RxError.newRxError('JD3', {
            passwordHash: exportedJSON.passwordHash,
            own: hash(this.database.password)
        });
    }

    const importFns = exportedJSON.docs
        // decrypt
        .map(doc => this._crypter.decrypt(doc))
        // validate schema
        .map(doc => this.schema.validate(doc))
        // import
        .map(doc => {
            return this._pouchPut(doc).then(() => {
                const primary = doc[this.schema.primaryPath];
                // emit changeEvents
                const emitEvent = RxChangeEvent.create(
                    'INSERT',
                    this.database,
                    this,
                    null,
                    doc
                );
                emitEvent.data.doc = primary;
                this.$emit(emitEvent);
            });
        });
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
