import { newRxError } from '../../rx-error';
import objectPath from 'object-path';
import type {
    CRDTDocumentField,
    CRDTEntry,
    CRDTOperation,
    JsonSchema,
    RxDocument,
    RxDocumentData,
    RxJsonSchema,
    RxPlugin,
    RxStorageStatics
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
        console.dir(fullDocData);
        console.log('--------------------------------');
        return fullDocData;
    });
}


function addOperationToField<RxDocType>(
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
            }
        },
        additionalProperties: false,
        required: ['operations']
    };
}

export const RxDDcrdtPlugin: RxPlugin = {
    name: 'crdt',
    rxdb: true,
    prototypes: {
        RxDocument: (proto: any) => {
            proto.updateCRDT = updateCRDT;
            proto.remove = function (this: RxDocument) {
                return this.updateCRDT({
                    ifMatch: {
                        $set: {
                            _deleted: true
                        }
                    }
                });
            }
            proto.atomicPatch = function (this: RxDocument, patch: any) {
                return this.updateCRDT({
                    ifMatch: {
                        $set: patch
                    }
                });
            }
        }
    },
    overwritable: {},
    hooks: {
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
                    objectPath.set(docData, crdtField, crdtOperations);
                }, false);
            }
        }
    }
};
