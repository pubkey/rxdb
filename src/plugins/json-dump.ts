/**
 * this plugin adds the json export/import capabilities to RxDB
 */
import { createChangeEvent } from '../rx-change-event';
import { newRxError } from '../rx-error';
import { createRxQuery } from '../rx-query';
import { RxCollection, RxDatabase, RxDumpCollection, RxDumpCollectionAsAny, RxDumpDatabase } from '../types';
import { hash } from '../util';

async function dumpRxDatabase(
    this: RxDatabase,
    decrypted = false,
    collections?: string[]
) {

    const useCollections = await Promise.all(
        Object.entries(this.collections)
            .filter(([colName]) => !collections || collections.includes(colName))
            .filter(([colName]) => colName.charAt(0) !== '_')
            .map(async ([_, collection]) => await collection.dump(decrypted))
    );

    return {
        name: this.name,
        instanceToken: this.token,
        encrypted: this.password ? !decrypted : false,
        passwordHash: this.password ? hash(this.password) : null,
        collections: useCollections,
    };
}

const importDumpRxDatabase = function <Collections>(
    this: RxDatabase,
    dump: RxDumpDatabase<Collections>
): Promise<void> {
    /**
     * collections must be created before the import
     * because we do not know about the other collection-settings here
     */
    const missingCollections = dump.collections
        .filter(col => !this.collections[col.name])
        .map(col => col.name);
    if (missingCollections.length > 0) {
        throw newRxError('JD1', {
            missingCollections
        });
    }

    return Promise.all(
        dump.collections
            .map((colDump: any) => this.collections[colDump.name].importDump(colDump))
    ).then(() => void 0);
};

export const dumpRxCollection = async function <DT>(
    this: RxCollection,
    decrypted = false
) {

    const encrypted = !decrypted;
    const query = createRxQuery('find', {}, this);

    const pouchDocs: RxDumpCollection<DT>['docs'] = await this._pouchFind(query, undefined, encrypted)
        .then(docs =>
            docs.map(docData => {
                delete docData._rev;
                delete docData._attachments;
                return docData;
            })
        );

    const dump: RxDumpCollection<DT> = {
        name: this.name,
        schemaHash: this.schema.hash,
        encrypted: !!(this.database.password && encrypted),
        passwordHash: this.database.password && encrypted ? hash(this.database.password) : null,
        docs: pouchDocs
    };

    if (dump.encrypted) { return dump as RxDumpCollection<RxDumpCollectionAsAny<DT>>; }
    return dump as RxDumpCollection<DT>;
};

function importDumpRxCollection<DT>(
    this: RxCollection,
    exportedJSON: RxDumpCollection<DT>
): Promise<void> {
    // check schemaHash
    if (exportedJSON.schemaHash !== this.schema.hash) {
        throw newRxError('JD2', {
            schemaHash: exportedJSON.schemaHash,
            own: this.schema.hash
        });
    }

    // check if passwordHash matches own
    if (
        exportedJSON.encrypted &&
        exportedJSON.passwordHash !== hash(this.database.password)
    ) {
        throw newRxError('JD3', {
            passwordHash: exportedJSON.passwordHash,
            own: hash(this.database.password)
        });
    }

    const docs = exportedJSON.docs
        // decrypt
        .map((doc: any) => this._crypter.decrypt(doc))
        // validate schema
        .map((doc: any) => this.schema.validate(doc))
        // transform
        .map((doc: any) => this._handleToPouch(doc));

    return this.database.lockedRun(
        // write to disc
        () => this.pouch.bulkDocs(docs)
    ).then(() => {
        docs.forEach((doc: any) => {
            // emit change events
            const primary = doc[this.schema.primaryPath];
            const emitEvent = createChangeEvent(
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
}

export const rxdb = true;
export const prototypes = {
    RxDatabase: (proto: any) => {
        proto.dump = dumpRxDatabase;
        proto.importDump = importDumpRxDatabase;
    },
    RxCollection: (proto: any) => {
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
