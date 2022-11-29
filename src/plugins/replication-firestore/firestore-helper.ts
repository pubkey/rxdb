import { now } from '../../util';

export const FIRESTORE_REPLICATION_PLUGIN_IDENTITY_PREFIX = 'rxdb-replication-firestore-';


export function getFirestoreSortFieldValue(docData: any, primaryKey: string): string {
    const timeString = now() + '';
    return 'rxdb-' + timeString.padStart(15, '0') + '-' + docData[primaryKey];
}
