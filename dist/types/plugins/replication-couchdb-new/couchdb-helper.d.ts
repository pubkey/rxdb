import { WithDeleted } from '../../types';
import { URLQueryParams } from './couchdb-types';
export declare const COUCHDB_NEW_REPLICATION_PLUGIN_IDENTITY_PREFIX = "rxdb-replication-couchdb-";
export declare function mergeUrlQueryParams(params: URLQueryParams): string;
export declare function couchDBDocToRxDocData<RxDocType>(primaryPath: string, couchDocData: any): WithDeleted<RxDocType>;
