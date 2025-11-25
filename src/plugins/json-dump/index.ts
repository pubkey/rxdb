/**
 * this plugin adds the json export/import capabilities to RxDB
 */
import {
    createRxQuery,
    queryCollection,
    _getDefaultQuery
} from '../../rx-query.ts';
import {
    newRxError
} from '../../rx-error.ts';
import type {
    RxDatabase,
    RxCollection,
    RxPlugin,
    RxDocumentData
} from '../../types/index.d.ts';
import {
    flatClone,
    getDefaultRevision,
    now
} from '../../plugins/utils/index.ts';

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

const dumpRxCollection = async function (
    this: RxCollection
) {
    const json: any = {
        name: this.name,
        schemaHash: await this.schema.hash,
        docs: []
    };

    const query = createRxQuery(
        'find',
        _getDefaultQuery(),
        this
    );
    return queryCollection(query)
        .then((result) => {
            json.docs = result.docs.map((docData: any) => {
                docData = flatClone(docData);
                delete docData._rev;
                delete docData._attachments;
                return docData;
            });
            return json;
        });
};

async function importDumpRxCollection<RxDocType>(
    this: RxCollection<RxDocType>,
    exportedJSON: any
): Promise<any> {
    // check schemaHash
    if (exportedJSON.schemaHash !== await this.schema.hash) {
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
