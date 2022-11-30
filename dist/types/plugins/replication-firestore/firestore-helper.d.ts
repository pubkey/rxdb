import { QueryDocumentSnapshot, Timestamp } from 'firebase/firestore';
import type { WithDeleted } from '../../types';
export declare const FIRESTORE_REPLICATION_PLUGIN_IDENTITY_PREFIX = "rxdb-replication-firestore-";
export declare function getFirestoreSortFieldValue(docData: any, primaryKey: string): string;
export declare function stripServerTimestampField<RxDocType>(serverTimestampField: string, docData: RxDocType): WithDeleted<RxDocType>;
export declare function serverTimestampToIsoString(serverTimestampField: string, docData: any): string;
export declare function isoStringToServerTimestamp(isoString: string): Timestamp;
export declare function firestoreRowToDocData<RxDocType>(serverTimestampField: string, primaryPath: string, row: QueryDocumentSnapshot<RxDocType>): WithDeleted<RxDocType>;
export declare function stripPrimaryKey(primaryPath: string, docData: any): any;
