import { Timestamp } from 'firebase/firestore';
import { flatClone, now } from '../../util';

export const FIRESTORE_REPLICATION_PLUGIN_IDENTITY_PREFIX = 'rxdb-replication-firestore-';


export function getFirestoreSortFieldValue(docData: any, primaryKey: string): string {
    const timeString = now() + '';
    return 'rxdb-' + timeString.padStart(15, '0') + '-' + docData[primaryKey];
}

export function stripServerTimestampField<RxDocType>(
    serverTimestampField: string,
    docData: RxDocType
): RxDocType {
    const data = flatClone(docData);
    delete (data as any)[serverTimestampField];
    return data;
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
