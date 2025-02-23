import {
    QueryDocumentSnapshot,
    Timestamp
} from 'firebase/firestore';
import type {
    WithDeleted
} from '../../types/index.d.ts';
import { flatClone, now } from '../../plugins/utils/index.ts';
import type { GetQuery } from './firestore-types.ts';


export function getFirestoreSortFieldValue(docData: any, primaryKey: string): string {
    const timeString = now() + '';
    return 'rxdb-' + timeString.padStart(15, '0') + '-' + docData[primaryKey];
}

export function stripServerTimestampField<RxDocType>(
    serverTimestampField: string,
    docData: RxDocType
): WithDeleted<RxDocType> {
    const data = flatClone(docData);
    delete (data as any)[serverTimestampField];
    return data as any;
}


export function serverTimestampToIsoString(serverTimestampField: string, docData: any): string {
    const timestamp = (docData as any)[serverTimestampField];
    const date: Date = timestamp.toDate();
    return date.toISOString();
}

export function isoStringToServerTimestamp(isoString: string): Timestamp {
    const date = new Date(isoString);
    return Timestamp.fromDate(date);
}

export function firestoreRowToDocData<RxDocType>(
    serverTimestampField: string,
    primaryPath: string,
    row: QueryDocumentSnapshot<RxDocType>
): WithDeleted<RxDocType> {
    const docData = stripServerTimestampField(
        serverTimestampField,
        row.data()
    );
    (docData as any)[primaryPath] = row.id;

    if (primaryPath !== 'id') {
        delete (docData as any)['id'];
    }

    return docData;
}

export function stripPrimaryKey(
    primaryPath: string,
    docData: any
): any {
    docData = flatClone(docData);
    delete (docData as any)[primaryPath];
    return docData;
}

// https://stackoverflow.com/questions/61354866/is-there-a-workaround-for-the-firebase-query-in-limit-to-10
export function getContentByIds<RxDocType>(ids: string[], getQuery: GetQuery<RxDocType>): Promise<QueryDocumentSnapshot<RxDocType>[]> {
    const batches = [];

    while (ids.length) {
        // firestore limits batches to 10
        const batch = ids.splice(0, 10);

        // add the batch request to to a queue
        batches.push(getQuery(batch));
    }

    // after all of the data is fetched, return it
    return Promise.all(batches).then((content) => content.flat());
}
