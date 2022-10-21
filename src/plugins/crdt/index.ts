import { newRxError } from '../../rx-error';
import objectPath from 'object-path';
import type {
    CRDTDocumentField,
    CRDTEntry,
    CRDTOperation,
    RxDocument,
    RxPlugin
} from '../../types';
import { ensureNotFalsy, now, parseRevision } from '../../util';
import {
    pushAtSortPosition
} from 'array-push-at-sort-position';


export async function updateCRDT<RxDocType>(
    this: RxDocument<RxDocType>,
    entry: CRDTEntry<RxDocType>
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

    this.atomicUpdate((docData, rxDoc) => {
        const crdtDocField: CRDTDocumentField<RxDocType> = objectPath.get(docData as any, crdtOptions.field);
        const currentRevision = parseRevision(rxDoc.revision);
        const operation: CRDTOperation<RxDocType> = {
            body: entry,
            creator: storageToken,
            time: now()
        };
        addOperationToField(
            crdtDocField,
            operation,
            currentRevision.height
        );
        crdtDocField.ops[currentRevision.height].push();
        return docData;
    });
}


function addOperationToField<RxDocType>(
    crdtDocField: CRDTDocumentField<RxDocType>,
    operation: CRDTOperation<RxDocType>,
    currentRevisionHeight: number
) {
    if (!crdtDocField.ops[currentRevisionHeight]) {
        crdtDocField.ops[currentRevisionHeight] = [];
    }
    pushAtSortPosition(
        crdtDocField.ops[currentRevisionHeight],
        operation,
        (a: CRDTOperation<RxDocType>, b: CRDTOperation<RxDocType>) => ((a.creator > b.creator) ? 1 : -1)
    );
}

export const RxDDcrdtPlugin: RxPlugin = {
    name: 'crdt',
    rxdb: true,
    prototypes: {
        RxDocument: (proto: any) => {
            proto.updateCRDT = updateCRDT;
        }
    },
    overwritable: {},
    hooks: {
    }
};
