/**
 * this plugin adds the json export/import capabilities to RxDB
 */
import {
    createRxQuery,
    queryCollection,
    _getDefaultQuery
} from '../../rx-query';
import {
    newRxError
} from '../../rx-error';
import type {
    RxDatabase,
    RxCollection,
    RxPlugin,
    RxDocumentData
} from '../../types';
import {
    flatClone,
    getDefaultRevision,
    now
} from '../../plugins/utils';

function dumpRxDatabase(
    this: RxDatabase,
    collections?: string[]
): Promise<any> {
    const json: any = {
        name: this.name,
        instanceToken: this.token,
        collections: []
    };

    const useCollections = Object.keys(this.collections)
        .filter(colName => !collections || collections.includes(colName))
        .filter(colName => colName.charAt(0) !== '_')
        .map(colName => this.collections[colName]);

    return Promise.all(
        useCollections
            .map(col => col.exportJSON())
    ).then(cols => {
        json.collections = cols;
        return json;
    });
}

const importDumpRxDatabase = function (
    this: RxDatabase,
    dump: any
) {
    /**
     * collections must be created before the import
     * because we do not know about the other collection-settings here
     */
    const missingCollections = dump.collections
        .filter((col: any) => !this.collections[col.name])
        .map((col: any) => col.name);
    if (missingCollections.length > 0) {
        throw newRxError('JD1', {
            missingCollections
        });
    }

    return Promise.all(
        dump.collections
            .map((colDump: any) => this.collections[colDump.name].importJSON(colDump))
    );
};

const dumpRxCollection = function (
    this: RxCollection
) {
    const json: any = {
        name: this.name,
        schemaHash: this.schema.hash,
        docs: []
    };

    const query = createRxQuery(
        'find',
        _getDefaultQuery(),
        this
    );
    return queryCollection(query)
        .then((docs: any) => {
            json.docs = docs.map((docData: any) => {
                docData = flatClone(docData);
                delete docData._rev;
                delete docData._attachments;
                return docData;
            });
            return json;
        });
};

function importDumpRxCollection<RxDocType>(
    this: RxCollection<RxDocType>,
    exportedJSON: any
): Promise<any> {
    // check schemaHash
    if (exportedJSON.schemaHash !== this.schema.hash) {
        throw newRxError('JD2', {
            schemaHash: exportedJSON.schemaHash,
            own: this.schema.hash
        });
    }

    const docs: RxDocType[] = exportedJSON.docs;
    return this.storageInstance.bulkWrite(
        docs.map(docData => {
            const document: RxDocumentData<RxDocType> = Object.assign(
                {},
                docData,
                {
                    _meta: {
                        lwt: now()
                    },
                    _rev: getDefaultRevision(),
                    _attachments: {},
                    _deleted: false
                }
            );
            return {
                document
            };
        }),
        'json-dump-import'
    );
}

export const RxDBJsonDumpPlugin: RxPlugin = {
    name: 'json-dump',
    rxdb: true,
    prototypes: {
        RxDatabase: (proto: any) => {
            proto.exportJSON = dumpRxDatabase;
            proto.importJSON = importDumpRxDatabase;
        },
        RxCollection: (proto: any) => {
            proto.exportJSON = dumpRxCollection;
            proto.importJSON = importDumpRxCollection;
        }
    },
    overwritable: {}
};
