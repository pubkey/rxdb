import {
    QueryDocumentSnapshot,
    Timestamp
} from 'firebase/firestore';
import type {
    WithDeleted
} from '../../types';
import { flatClone, now } from '../../util';

export const FIRESTORE_REPLICATION_PLUGIN_IDENTITY_PREFIX = 'rxdb-replication-firestore-';


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
