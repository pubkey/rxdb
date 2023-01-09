import type {
    RxCollection,
    WithDeleted
} from '../../types';
import { flatClone } from '../../plugins/utils';
import { getComposedPrimaryKeyOfDocumentData } from '../../rx-schema-helper';

// does nothing
export const DEFAULT_MODIFIER = (d: any) => Promise.resolve(d);


export function swapDefaultDeletedTodeletedField<RxDocType>(
    deletedField: string,
    doc: WithDeleted<RxDocType>
): RxDocType {
    if (deletedField === '_deleted') {
        return doc;
    } else {
        doc = flatClone(doc);
        const isDeleted = !!doc._deleted;
        (doc as any)[deletedField] = isDeleted;
        delete (doc as any)._deleted;
        return doc;
    }
}

/**
 * Must be run over all plain document data
 * that was pulled from the remote.
 * Used to fill up fields or modify the deleted field etc.
 */
export function handlePulledDocuments<RxDocType>(
    collection: RxCollection<RxDocType>,
    deletedField: string,
    docs: RxDocType[]
): WithDeleted<RxDocType>[] {
    return docs.map(doc => {
        const useDoc: WithDeleted<RxDocType> = flatClone(doc) as any;

        /**
         * Swap out the deleted field
         */
        if (deletedField !== '_deleted') {
            const isDeleted = !!(useDoc as any)[deletedField];
            (useDoc as any)._deleted = isDeleted;
            delete (useDoc as any)[deletedField];
        } else {
            // ensure we have a boolean.
            useDoc._deleted = !!useDoc._deleted;
        }

        /**
         * Fill up composed primary
         */
        const primaryPath = collection.schema.primaryPath;
        (useDoc as any)[primaryPath] = getComposedPrimaryKeyOfDocumentData(
            collection.schema.jsonSchema,
            useDoc
        );
        return useDoc as any;
    });
}


export function awaitRetry(
    collection: RxCollection,
    retryTime: number
) {
    if (
        typeof window === 'undefined' ||
        typeof window !== 'object' ||
        typeof window.addEventListener === 'undefined' ||
        navigator.onLine
    ) {
        return collection.promiseWait(retryTime);
    }

    let listener: any;
    const onlineAgain = new Promise<void>(res => {
        listener = () => {
            window.removeEventListener('online', listener);
            res();
        };
        window.addEventListener('online', listener);
    });

    return Promise.race([
        onlineAgain,
        collection.promiseWait(retryTime)
    ]).then(() => {
        window.removeEventListener('online', listener);
    });
}
