import type { RxCollection, RxDatabase, RxLocalDocument } from '../../types/index.d.ts';
import { Observable } from 'rxjs';
/**
 * save the local-document-data
 * throws if already exists
 */
export declare function insertLocal<DocData extends Record<string, any> = any, Reactivity = unknown>(this: RxDatabase | RxCollection, id: string, data: DocData): Promise<RxLocalDocument<DocData, any, Reactivity>>;
/**
 * save the local-document-data
 * overwrites existing if exists
 */
export declare function upsertLocal<DocData extends Record<string, any> = any, Reactivity = unknown>(this: any, id: string, data: DocData): Promise<RxLocalDocument<DocData, any, Reactivity>>;
export declare function getLocal<DocData = any, Reactivity = unknown>(this: any, id: string): Promise<RxLocalDocument<DocData, any, Reactivity> | null>;
export declare function getLocal$<DocData = any, Reactivity = unknown>(this: RxCollection, id: string): Observable<RxLocalDocument<DocData, any, Reactivity> | null>;
