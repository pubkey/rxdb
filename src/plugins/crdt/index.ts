import { newRxError } from '../../rx-error';
import deepEqual from 'fast-deep-equal';
import objectPath from 'object-path';
import type {
    CRDTDocumentField,
    CRDTEntry,
    CRDTOperation,
    HashFunction,
    JsonSchema,
    RxConflictHandler,
    RxConflictHandlerInput,
    RxDocument,
    RxDocumentData,
    RxJsonSchema,
    RxPlugin,
    RxStorageStatics,
    WithDeleted
} from '../../types';
import {
    clone,
    ensureNotFalsy,
    now,
    objectPathMonad
} from '../../util';
import modifyjs from 'modifyjs';
import {
    overwritable,
    RxCollection,
    RxDocumentWriteData,
    RxError
} from '../..';



export async function updateCRDT<RxDocType>(
    this: RxDocument<RxDocType>,
    entry: CRDTEntry<RxDocType> | CRDTEntry<RxDocType>[]
) {
    entry = overwritable.deepFreezeWhenDevMode(entry) as any;

    const jsonSchema = this.collection.schema.jsonSchema;
    if (!jsonSchema.crdt) {
        throw newRxError('CRDT1', {
            schema: jsonSchema,
            queryObj: entry
        });
    }
    const crdtOptions = ensureNotFalsy(jsonSchema.crdt);
    const storageToken = await this.collection.database.storageToken;

    return this.atomicUpdate((docData, rxDoc) => {
        const crdtDocField: CRDTDocumentField<RxDocType> = clone(objectPath.get(docData as any, crdtOptions.field));
        const operation: CRDTOperation<RxDocType> = {
            body: Array.isArray(entry) ? entry : [entry],
            creator: storageToken,
            time: now()
        };

        /**
         * A new write will ALWAYS be an operation in the last
         * array which was non existing before.
         */
        const lastAr: CRDTOperation<RxDocType>[] = [operation];
        crdtDocField.operations.push(lastAr);
        crdtDocField.hash = hashCRDTOperations(this.collection.database.hashFunction, crdtDocField);

        let newDocData: WithDeleted<RxDocType> = clone(rxDoc.toJSON()) as any;
        newDocData._deleted = rxDoc._data._deleted;
        newDocData = runOperationOnDocument(
            this.collection.database.storage.statics,
            this.collection.schema.jsonSchema,
            newDocData,
            operation
        );
        objectPath.set(newDocData, crdtOptions.field, crdtDocField);

        // add other internal fields
        const fullDocData: RxDocumentData<RxDocType> = Object.assign({
            _attachments: rxDoc._data._attachments,
            _meta: rxDoc._data._meta,
            _rev: rxDoc._data._rev
        }, newDocData);

        return fullDocData;
    }, RX_CRDT_CONTEXT);
}


export async function insertCRDT<RxDocType>(
    this: RxCollection<RxDocType>,
    entry: CRDTEntry<RxDocType> | CRDTEntry<RxDocType>[]
) {
    entry = overwritable.deepFreezeWhenDevMode(entry) as any;

    const jsonSchema = this.schema.jsonSchema;
    if (!jsonSchema.crdt) {
        throw newRxError('CRDT1', {
            schema: jsonSchema,
            queryObj: entry
        });
    }
    const crdtOptions = ensureNotFalsy(jsonSchema.crdt);
    const storageToken = await this.database.storageToken;
    const operation: CRDTOperation<RxDocType> = {
        body: Array.isArray(entry) ? entry : [entry],
        creator: storageToken,
        time: now()
    };

    let insertData: RxDocumentWriteData<RxDocType> = {} as any;
    insertData = runOperationOnDocument(
        this.database.storage.statics,
        this.schema.jsonSchema,
        insertData as any,
        operation
    ) as any;
    const crdtDocField: CRDTDocumentField<RxDocType> = {
        operations: [],
        hash: ''
    };
    objectPath.set(insertData as any, crdtOptions.field, crdtDocField);

    const lastAr: CRDTOperation<RxDocType>[] = [operation];
    crdtDocField.operations.push(lastAr);
    crdtDocField.hash = hashCRDTOperations(this.database.hashFunction, crdtDocField);

    const result = await this.insert(insertData).catch(async (err: RxError) => {
        if (err.code === 'COL19') {
            // was a conflict, update document instead of inserting
            const doc = await this.findOne(err.parameters.id).exec(true);
            return doc.updateCRDT(entry);
        } else {
            throw err;
        }
    });
    return result;
}


export function sortOperationComparator<RxDocType>(a: CRDTOperation<RxDocType>, b: CRDTOperation<RxDocType>) {
    return a.creator > b.creator ? 1 : -1;
}


function runOperationOnDocument<RxDocType>(
    storageStatics: RxStorageStatics,
    schema: RxJsonSchema<RxDocumentData<RxDocType>>,
    docData: WithDeleted<RxDocType>,
    operation: CRDTOperation<RxDocType>
): WithDeleted<RxDocType> {
    const entryParts = operation.body;
    entryParts.forEach(entryPart => {
        let isMatching: boolean;
        if (entryPart.selector) {
            const preparedQuery = storageStatics.prepareQuery(schema, {
                selector: ensureNotFalsy(entryPart.selector),
                sort: [],
                skip: 0
            });
            const matcher = storageStatics.getQueryMatcher(schema, preparedQuery);
            isMatching = matcher(docData as any);
        } else {
            isMatching = true;
        }
        if (isMatching) {
            if (entryPart.ifMatch) {
                docData = modifyjs(docData, entryPart.ifMatch);
            }
        } else {
            if (entryPart.ifNotMatch) {
                docData = modifyjs(docData, entryPart.ifNotMatch);
            }
        }
    });
    return docData;
}

export function hashCRDTOperations(
    hashFunction: HashFunction,
    crdts: CRDTDocumentField<any>
): string {
    const hashObj = crdts.operations.map((operations) => {
        return operations.map(op => op.creator);
    });
    const hash = hashFunction(JSON.stringify(hashObj));
    return hash;
}

export function getCRDTSchemaPart<RxDocType>(): JsonSchema<CRDTDocumentField<RxDocType>> {
    const operationSchema: JsonSchema<CRDTOperation<RxDocType>> = {
        type: 'object',
        properties: {
            body: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        selector: {
                            type: 'object'
                        },
                        ifMatch: {
                            type: 'object'
                        },
                        ifNotMatch: {
                            type: 'object'
                        }
                    },
                    additionalProperties: false
                },
                minItems: 1
            },
            creator: {
                type: 'string'
            },
            time: {
                type: 'number',
                minimum: 1,
                maximum: 1000000000000000,
                multipleOf: 0.01
            }
        },
        additionalProperties: false,
        required: [
            'body',
            'creator',
            'time'
        ]
    };
    return {
        type: 'object',
        properties: {
            operations: {
                type: 'array',
                items: {
                    type: 'array',
                    items: operationSchema
                }
            },
            hash: {
                type: 'string',
                // set a minLength to not accidentially store an empty string
                minLength: 2
            }
        },
        additionalProperties: false,
        required: ['operations', 'hash']
    };
}


export function mergeCRDTFields<RxDocType>(
    hashFunction: HashFunction,
    crdtsA: CRDTDocumentField<RxDocType>,
    crdtsB: CRDTDocumentField<RxDocType>
): CRDTDocumentField<RxDocType> {

    // the value with most operations must be A to
    // ensure we not miss out rows when iterating over both fields.
    if (crdtsA.operations.length < crdtsB.operations.length) {
        [crdtsA, crdtsB] = [crdtsB, crdtsA];
    }

    const ret: CRDTDocumentField<RxDocType> = {
        operations: [],
        hash: ''
    };
    crdtsA.operations.forEach((row, index) => {
        let mergedOps: CRDTOperation<RxDocType>[] = [];
        const ids = new Set<string>(); // used to deduplicate

        row.forEach(op => {
            ids.add(op.creator);
            mergedOps.push(op);
        });
        crdtsB.operations[index] && crdtsB.operations[index].forEach(op => {
            if (!ids.has(op.creator)) {
                mergedOps.push(op);
            }
        });
        mergedOps = mergedOps.sort(sortOperationComparator);
        ret.operations[index] = mergedOps;
    });


    ret.hash = hashCRDTOperations(hashFunction, ret);
    return ret;
}

export function rebuildFromCRDT<RxDocType>(
    storageStatics: RxStorageStatics,
    schema: RxJsonSchema<RxDocumentData<RxDocType>>,
    docData: WithDeleted<RxDocType>,
    crdts: CRDTDocumentField<RxDocType>
): WithDeleted<RxDocType> {
    let base: WithDeleted<RxDocType> = {
        _deleted: false
    } as any;
    objectPath.set(base, ensureNotFalsy(schema.crdt).field, crdts);
    crdts.operations.forEach(operations => {
        operations.forEach(op => {
            base = runOperationOnDocument(
                storageStatics,
                schema,
                base,
                op
            );
        });
    });
    return base;
}


export function getCRDTConflictHandler<RxDocType>(
    hashFunction: HashFunction,
    storageStatics: RxStorageStatics,
    schema: RxJsonSchema<RxDocumentData<RxDocType>>
): RxConflictHandler<RxDocType> {
    const crdtOptions = ensureNotFalsy(schema.crdt);
    const crdtField = crdtOptions.field;
    const getCRDTValue = objectPathMonad<WithDeleted<RxDocType>, CRDTDocumentField<RxDocType>>(crdtField);

    const conflictHandler: RxConflictHandler<RxDocType> = (
        i: RxConflictHandlerInput<RxDocType>,
        _context: string
    ) => {

        console.log('RUN getCRDTConflictHandler()()');

        const newDocCrdt = getCRDTValue(i.newDocumentState);
        const masterDocCrdt = getCRDTValue(i.realMasterState);

        if (newDocCrdt.hash === masterDocCrdt.hash) {
            return Promise.resolve({
                isEqual: true
            });
        }

        console.log('getCRDTConflictHandler not equal:');
        console.dir(i);


        const mergedCrdt = mergeCRDTFields(hashFunction, newDocCrdt, masterDocCrdt);
        const mergedDoc = rebuildFromCRDT(
            storageStatics,
            schema,
            i.newDocumentState,
            mergedCrdt
        );


        console.log('getCRDTConflictHandler mergedCrdt:');
        console.dir(mergedCrdt);

        return Promise.resolve({
            isEqual: false,
            documentData: mergedDoc
        });

    };

    return conflictHandler;
}


export const RX_CRDT_CONTEXT = 'rx-crdt';

export const RxDDcrdtPlugin: RxPlugin = {
    name: 'crdt',
    rxdb: true,
    prototypes: {
        RxDocument: (proto: any) => {
            proto.updateCRDT = updateCRDT;

            const oldRemove = proto.remove;
            proto.remove = function (this: RxDocument) {
                if (!this.collection.schema.jsonSchema.crdt) {
                    return oldRemove.bind(this)();
                }
                return this.updateCRDT({
                    ifMatch: {
                        $set: {
                            _deleted: true
                        }
                    }
                });
            }

            const oldAtomicPatch = proto.atomicPatch;
            proto.atomicPatch = function (this: RxDocument, patch: any) {
                if (!this.collection.schema.jsonSchema.crdt) {
                    return oldAtomicPatch.bind(this)(patch);
                }
                return this.updateCRDT({
                    ifMatch: {
                        $set: patch
                    }
                });
            }
            const oldAtomicUpdate = proto.atomicUpdate;
            proto.atomicUpdate = function (fn: any, context: string) {
                if (!this.collection.schema.jsonSchema.crdt) {
                    return oldAtomicUpdate.bind(this)(fn);
                }
                if (context === RX_CRDT_CONTEXT) {
                    return oldAtomicUpdate.bind(this)(fn);
                } else {
                    throw newRxError('CRDT2', {
                        id: this.primary,
                        args: { context }
                    });
                }
            };
        },
        RxCollection: (proto: any) => {
            proto.insertCRDT = insertCRDT;
        }
    },
    overwritable: {},
    hooks: {
        preCreateRxCollection: {
            after: (data) => {
                if (!data.schema.crdt) {
                    return;
                }
                if (data.conflictHandler) {
                    throw newRxError('CRDT3', {
                        collection: data.name,
                        schema: data.schema
                    });
                }
                data.conflictHandler = getCRDTConflictHandler(
                    data.database.hashFunction,
                    data.database.storage.statics,
                    data.schema
                );
            }
        },
        createRxCollection: {
            after: ({ collection }) => {
                if (!collection.schema.jsonSchema.crdt) {
                    return;
                }

                const crdtOptions = ensureNotFalsy(collection.schema.jsonSchema.crdt);
                const crdtField = crdtOptions.field;
                const getCrdt = objectPathMonad<any, CRDTDocumentField<any>>(crdtOptions.field);

                /**
                 * In dev-mode we have to ensure that all document writes
                 * have the correct crdt state so that nothing is missed out
                 * or could accidentially do non-crdt writes to the document.
                 */
                if (overwritable.isDevMode()) {
                    const bulkWriteBefore = collection.storageInstance.bulkWrite.bind(collection.storageInstance);
                    collection.storageInstance.bulkWrite = function (writes, context) {

                        writes.forEach(write => {
                            const newDocState: typeof write.document = clone(write.document);
                            const crdts = getCrdt(newDocState);

                            const rebuild = rebuildFromCRDT(
                                collection.database.storage.statics,
                                collection.schema.jsonSchema,
                                newDocState,
                                crdts
                            );

                            function docWithoutMeta(doc: any) {
                                const ret: any = {};
                                Object.entries(doc).forEach(([k, v]) => {
                                    if (!k.startsWith('_')) {
                                        ret[k] = v;
                                    }
                                });
                                return ret;
                            }
                            if (!deepEqual(docWithoutMeta(newDocState), docWithoutMeta(rebuild))) {
                                throw newRxError('SNH', {
                                    document: newDocState
                                });
                            }
                            const recalculatedHash = hashCRDTOperations(collection.database.hashFunction, crdts);
                            if (crdts.hash !== recalculatedHash) {
                                throw newRxError('SNH', {
                                    document: newDocState,
                                    args: { hash: crdts.hash, recalculatedHash }
                                });
                            }
                        });

                        return bulkWriteBefore(writes, context);
                    }
                }


                const bulkInsertBefore = collection.bulkInsert.bind(collection);
                collection.bulkInsert = async function (docsData: any[]) {
                    const storageToken = await collection.database.storageToken;
                    const useDocsData = docsData.map(docData => {
                        const setMe: Partial<RxDocumentData<any>> = {};
                        Object.entries(docData).forEach(([key, value]) => {
                            if (
                                !key.startsWith('_') &&
                                key !== crdtField
                            ) {
                                setMe[key] = value;
                            }
                        });

                        const crdtOperations: CRDTDocumentField<any> = {
                            operations: [
                                [{
                                    creator: storageToken,
                                    body: [{
                                        ifMatch: {
                                            $set: setMe
                                        }
                                    }],
                                    time: now()
                                }]
                            ],
                            hash: ''
                        };
                        crdtOperations.hash = hashCRDTOperations(collection.database.hashFunction, crdtOperations);
                        objectPath.set(docData, crdtOptions.field, crdtOperations);
                        return docData;
                    });
                    return bulkInsertBefore(useDocsData);
                }
            }
        }
    }
};
