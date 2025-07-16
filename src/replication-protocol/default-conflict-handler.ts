import {
    deepEqual,
    flatClone
} from '../plugins/utils/index.ts';
import { stripAttachmentsDataFromDocument } from '../rx-storage-helper.ts';
import type { RxConflictHandler, RxDocumentData } from '../types';

export const defaultConflictHandler: RxConflictHandler<any> = {
    isEqual(a, b, _ctx) {
        a = addAttachmentsIfNotExists(a);
        b = addAttachmentsIfNotExists(b);

        /**
         * If the documents are deep equal,
         * we have no conflict.
         * On your custom conflict handler you might only
         * check some properties, like the updatedAt time,
         * for better performance, because deepEqual is expensive.
        */
        const ret = deepEqual(
            stripAttachmentsDataFromDocument(a),
            stripAttachmentsDataFromDocument(b)
        );
        return ret;
    },
    resolve(i) {
        /**
         * The default conflict handler will always
         * drop the fork state and use the master state instead.
         */
        return i.realMasterState;
    }
};


function addAttachmentsIfNotExists<T>(d: RxDocumentData<T>): RxDocumentData<T> {
    if (!d._attachments) {
        d = flatClone(d);
        d._attachments = {};
    }
    return d;
}
