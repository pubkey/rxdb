import { newRxError } from '../../rx-error';
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
    objectPathMonad,
    parseRevision
} from '../../util';
import {
    pushAtSortPosition
} from 'array-push-at-sort-position';
import modifyjs from 'modifyjs';


export async function updateCRDT<RxDocType>(
    this: RxDocument<RxDocType>,
    entry: CRDTEntry<RxDocType> | CRDTEntry<RxDocType>[]
) {
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
        const currentRevision = parseRevision(rxDoc.revision);
        const operation: CRDTOperation<RxDocType> = {
            body: Array.isArray(entry) ? entry : [entry],
            creator: storageToken,
            time: now()
        };
        addOperationToField(
            this.collection.database.hashFunction,
            crdtDocField,
            operation,
            currentRevision.height
        );
        crdtDocField.operations[currentRevision.height].push(operation);
        let fullDocData = rxDoc.toMutableJSON(true);
        fullDocData = runOperationOnDocument(
            this.collection.database.storage.statics,
            this.collection.schema.jsonSchema,
            fullDocData,
            operation
        );
        (fullDocData as any)[crdtOptions.field] = crdtDocField;
        return fullDocData;
    }, RX_CRDT_CONTEXT);
}


function addOperationToField<RxDocType>(
    hashFunction: HashFunction,
    crdtDocField: CRDTDocumentField<RxDocType>,
    operation: CRDTOperation<RxDocType>,
    currentRevisionHeight: number
) {
    if (!crdtDocField.operations[currentRevisionHeight]) {
        crdtDocField.operations[currentRevisionHeight] = [];
    }
    pushAtSortPosition(
        crdtDocField.operations[currentRevisionHeight],
        operation,
        (a: CRDTOperation<RxDocType>, b: CRDTOperation<RxDocType>) => ((a.creator > b.creator) ? 1 : -1)
    );
    updateCRDTOperationsHash(hashFunction, crdtDocField);
}

function runOperationOnDocument<RxDocType>(
    storageStatics: RxStorageStatics,
    schema: RxJsonSchema<RxDocumentData<RxDocType>>,
    docData: RxDocumentData<RxDocType>,
    operation: CRDTOperation<RxDocType>
): RxDocumentData<RxDocType> {
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
            isMatching = matcher(docData);
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

export function updateCRDTOperationsHash(
    hashFunction: HashFunction,
    crdts: CRDTDocumentField<any>
): CRDTDocumentField<any> {
    const hashObj = crdts.operations.map((operations, operationRevisionHeight) => {
        return operations.map(op => op.creator);
    });
    const hash = hashFunction(JSON.stringify(hashObj));
    crdts.hash = hash;
    return crdts;
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
                type: 'string'
            }
        },
        additionalProperties: false,
        required: ['operations', 'hash']
    };
}

export function getCRDTConflictHandler<RxDocType>(
    schema: RxJsonSchema<RxDocumentData<RxDocType>>
): RxConflictHandler<RxDocType> {
    const crdtOptions = ensureNotFalsy(schema.crdt);
    const crdtField = crdtOptions.field;
    const getCRDTValue = objectPathMonad<WithDeleted<RxDocType>, CRDTDocumentField<RxDocType>>(crdtField);

    const conflictHandler: RxConflictHandler<RxDocType> = (
        i: RxConflictHandlerInput<RxDocType>,
        context: string
    ) => {

        console.dir(i);

        if (getCRDTValue(i.newDocumentState).hash === getCRDTValue(i.realMasterState).hash) {
            return Promise.resolve({
                isEqual: true
            });
        }

        return {} as any;
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
                data.conflictHandler = getCRDTConflictHandler(data.schema);
            }
        },
        createRxCollection: {
            after: ({ collection }) => {
                if (!collection.schema.jsonSchema.crdt) {
                    return;
                }
                const crdtOptions = ensureNotFalsy(collection.schema.jsonSchema.crdt);
                const crdtField = crdtOptions.field;
                const getCrdt = objectPathMonad(crdtOptions.field);

                collection.preInsert(async (docData: RxDocumentData<any>) => {
                    ensureNotFalsy(!getCrdt(docData));
                    const storageToken = await collection.database.storageToken;

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
                        ]
                    };
                    updateCRDTOperationsHash(collection.database.hashFunction, crdtOperations);
                    objectPath.set(docData, crdtField, crdtOperations);
                }, false);
            }
        }
    }
};
